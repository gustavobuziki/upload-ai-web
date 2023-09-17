import { api } from "@/lib/axios"
import { useEffect, useState } from "react"

import { Select } from "./ui"
import { SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"

interface PropmptSelectProps {
  onPromptSelected: (template: string) => void
}

type Prompts = {
  id: string
  title: string
  template: string
}

export const PromptSelect = ({ onPromptSelected }: PropmptSelectProps) => {
  const [prompts, setPrompts] = useState<Prompts[] | null>(null)

  useEffect(() => {
    api
      .get('/prompts')
      .then((response) => {
        setPrompts(response.data)
      })
  }, [])

  const handlePromptSelected = (promptId: string) => {
    const selectedPrompt = prompts?.find(prompt => prompt.id === promptId)

    if (!selectedPrompt) {
      return 
    }

    onPromptSelected(selectedPrompt.template)
  }

    return (
      <Select onValueChange={handlePromptSelected}>
        <SelectTrigger>
          <SelectValue placeholder="Selecione um prompt..." />
        </SelectTrigger>
        <SelectContent>
          {prompts?.map(prompt => (
            <SelectItem key={prompt.id} value={prompt.id}>
              {prompt.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
}