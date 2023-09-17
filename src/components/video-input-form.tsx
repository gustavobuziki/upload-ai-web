import { api } from "@/lib/axios"
import { getFFmpeg } from "@/lib/ffmpeg"
import { fetchFile } from "@ffmpeg/util"
import { FileVideo, Upload } from "lucide-react"
import { Button, Label, Separator, Textarea } from "./ui"
import { ChangeEvent, FormEvent, useMemo, useRef, useState } from "react"

type Status = 'waiting' | 'converting' | 'uploading' | 'generating' | 'success'

interface VideiInputForm {
    onVideoUploaded: (id: string) => void
}

const statusMessages = {
    converting: 'Convertendo...',
    generating: 'Transcrevendo...',
    uploading: 'Carregando...',
    success: 'Sucesso!'
}

export const VideoInputForm = ({ onVideoUploaded }: VideiInputForm) => {
    const [videoFile, setVideoFile] = useState<File | null>(null)
    const [status, setStatus] = useState<Status>('waiting')

    const promptInputRef = useRef<HTMLTextAreaElement>(null)

    const handleFileSelected = (event: ChangeEvent<HTMLInputElement>) => {
        const { files } = event.currentTarget
    
        if (!files) {
            return 
        }

        const selectedFile = files[0]

        setVideoFile(selectedFile)
    }

    const convertVideoToAudio = async (video: File) => {
        console.log('comelçou a conversão')

        const ffmpeg = await getFFmpeg()

        await ffmpeg.writeFile('input.mp4', await fetchFile(video))

        ffmpeg.on('progress', progress => {
            console.log('Convert progress: ' + Math.round(progress.progress * 100))
        })

        await ffmpeg.exec([
            '-i',
            'input.mp4',
            '-map',
            '0:a',
            '-b:a',
            '20k',
            '-acodec',
            'libmp3lame',
            'output.mp3'
        ])

        const data = await ffmpeg.readFile('output.mp3')

        const audioFileBlob = new Blob([data], { type: 'audio/mpeg' })
        const audioFile = new File([audioFileBlob], 'audio.mp3', {
            type: 'audio/mpeg'
        })
    
        console.log('converte finished')

        return audioFile
    }

    const handleUploadVideo = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        const prompt = promptInputRef.current?.value

        if (!videoFile) {
            return 
        }

        setStatus('converting')

        const audioFile = await convertVideoToAudio(videoFile)

        const data = new FormData()

        data.append('file', audioFile)

        setStatus('uploading')

        const response = await api.post('/videos', data)

        const videoId = response.data.video.id

        setStatus('generating')

        await api.post(`/videos/${videoId}/transcription`, {
            prompt
        })

        console.log('finalizou')

        setStatus('success')

        onVideoUploaded(videoId)
    }

    const previewURL = useMemo(() => {
        if (!videoFile) {
            return null
        }

        return URL.createObjectURL(videoFile)
    }, [videoFile])

    return (
        <form onSubmit={handleUploadVideo} className="space-y-6">
            <label 
                htmlFor="video"
                className="relative border flex rounded-md aspect-video cursor-pointer border-dashed text-sm flex-col gap-2 items-center justify-center text-muted-foreground hover:bg-primary/5"
            >
            {previewURL ? (
                <video src={previewURL} controls={false} className="pointer-events-none absolute inset-0" />
            ) : (
                <>
                    <FileVideo className="w-4 h-4" />
                    Selecione um vídeo
                </>
            )}
            </label>
            <input type="file" id="video" accept="video/mp4" className="sr-only" onChange={handleFileSelected} />

            <Separator />

            <div className="space-y-2">
            <Label className="transcription_prompt">Prompt de descrição</Label>
            <Textarea 
                ref={promptInputRef}
                disabled={status !== 'waiting'}
                id="transcription_prompt" 
                className="h-20 leading-relaxed" 
                placeholder="Inclua palavras-chave mencionadas no vídeo separadas por vírgula (,)" 
            />
            </div>

            <Button 
                data-success={status === 'success'} 
                disabled={status !== 'waiting'} 
                type="submit" 
                className="w-full data-[success=true]:bg-emerald-400"               
                >
               {status === 'waiting' ? (
                <>
                     Carregar vídeo
                    <Upload className="w-4 h-4 ml-2" />
                </>
               ) : (
                statusMessages[status]
               )}
            </Button>
      </form>
    )
}