import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Copy, Wand2, Info, Brain, Shield, Target, Globe, Play, LayoutTemplate, Sparkles } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";

interface PromptBuilderProps {
  className?: string;
  onUsePrompt?: (prompt: string) => void;
}

interface FieldConfig {
  key: string;
  label: string;
  placeholder: string;
  description: string;
  type: 'input' | 'textarea' | 'select';
  options?: string[];
  defaultValue?: string;
}

interface SectionConfig {
  id: string;
  title: string;
  icon: React.ElementType;
  iconColor: string;
  bgColor: string;
  description: string;
  fields: FieldConfig[];
}

const SECTIONS: SectionConfig[] = [
  {
    id: "core",
    title: "The Core (Required)",
    icon: Target,
    iconColor: "text-red-500",
    bgColor: "bg-red-50/40",
    description: "Define the main objective and providing necessary context.",
    fields: [
      {
        key: "objective",
        label: "The Objective (Task)",
        placeholder: "e.g., Write a Python script to scrape data, summarize this PDF...",
        description: "What do you want the AI to do? This defines the main verb.",
        type: "textarea"
      },
      {
        key: "input_data",
        label: "The Input Data (Context)",
        placeholder: "Paste raw text, background story, code snippets, or upload files here.",
        description: "What information does the AI need to know? Garbage in, garbage out.",
        type: "textarea"
      }
    ]
  },
  {
    id: "brain",
    title: "The Brain (Strategy)",
    icon: Brain,
    iconColor: "text-blue-500",
    bgColor: "bg-blue-50/40",
    description: "Set the persona and target audience for the response.",
    fields: [
      {
        key: "persona",
        label: "The Persona (Role)",
        placeholder: "e.g., Senior Python Developer, SEO Copywriter, Empathetic Therapist...",
        description: "Who should the AI act as? Sets the tone and expertise level.",
        type: "input"
      },
      {
        key: "audience",
        label: "The Audience",
        placeholder: "e.g., A 5-year-old, C-level executives, junior developers...",
        description: "Who is this for? Adjusts complexity and vocabulary.",
        type: "input"
      }
    ]
  },
  {
    id: "guardrails",
    title: "The Guardrails (Control)",
    icon: Shield,
    iconColor: "text-green-500",
    bgColor: "bg-green-50/40",
    description: "Control the format, style, and constraints of the output.",
    fields: [
      {
        key: "format",
        label: "Format & Style",
        placeholder: "Select a format...",
        description: "How should the output look? Prevents formatting hallucinations.",
        type: "select",
        options: ["Plain Text", "Markdown Table", "JSON", "Bullet Points", "Academic Essay", "Casual Tweet", "Code Block"],
        defaultValue: "Plain Text"
      },
      {
        key: "constraints",
        label: "Constraints (The 'Do Nots')",
        placeholder: "e.g., No fluff, no moral lectures, strictly under 500 words...",
        description: "What should the AI avoid? Reduces noise.",
        type: "textarea"
      },
      {
        key: "examples",
        label: "Examples (Few-Shot)",
        placeholder: "e.g., Input: 'Happy', Output: 'Ecstatic'.",
        description: "Give an example of a good result. The 'secret sauce' for high accuracy.",
        type: "textarea"
      }
    ]
  },
  {
    id: "language",
    title: "Language",
    icon: Globe,
    iconColor: "text-purple-500",
    bgColor: "bg-purple-50/40",
    description: "Choose the language for the generated prompt.",
    fields: [
      {
        key: "language",
        label: "Output Language",
        placeholder: "Select language...",
        description: "The language in which the prompt will be generated.",
        type: "select",
        options: ["English", "Indonesia"],
        defaultValue: "English"
      }
    ]
  }
];

const CO_STAR_TEMPLATE = `{{#if persona}}
# Role
You are a {{persona}}.
{{/if}}

{{#if input_data}}
# Context
{{input_data}}
{{/if}}

{{#if audience}}
# Audience
The target audience is: {{audience}}.
{{/if}}

# Task
{{objective}}

{{#if constraints}}
# Constraints
{{constraints}}
{{/if}}

{{#if format}}
# Output Format
Please provide the response in {{format}} format.
{{/if}}

{{#if examples}}
# Examples
{{examples}}
{{/if}}

{{#if language}}
# Language
Please respond in {{language}}.
{{/if}}`;

export default function PromptBuilder({ className, onUsePrompt }: PromptBuilderProps) {
  const [variables, setVariables] = useState<Record<string, string>>({
    objective: "",
    input_data: "",
    persona: "",
    audience: "",
    format: "Plain Text",
    constraints: "",
    examples: "",
    language: "English"
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [refinedPrompt, setRefinedPrompt] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'template' | 'result'>('template');

  const handleVariableChange = (key: string, value: string) => {
    setVariables(prev => ({ ...prev, [key]: value }));
  };

  const generatePreview = () => {
    let result = CO_STAR_TEMPLATE;

    const conditionalRegex = /{{#if\s+([a-zA-Z0-9_]+)}}([\s\S]*?){{\/if}}/g;
    result = result.replace(conditionalRegex, (match, varName, content) => {
      return variables[varName] && variables[varName].trim() !== "" ? content : "";
    });

    const varRegex = /{{([a-zA-Z0-9_]+)}}/g;
    result = result.replace(varRegex, (match, varName) => {
      return variables[varName] || "";
    });

    return result.replace(/\n{3,}/g, '\n\n').trim();
  };

  const preview = generatePreview();
  const displayContent = viewMode === 'result' && refinedPrompt ? refinedPrompt : preview;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(displayContent);
    toast.success("Copied to clipboard");
  };

  const handleGeneratePrompt = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/refine-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: preview,
          language: variables.language,
          format: variables.format
        }),
      });

      if (!response.ok) throw new Error('Failed to refine prompt');

      const data = await response.json();
      setRefinedPrompt(data.refinedPrompt);
      setViewMode('result'); // Switch to result view automatically
      toast.success("Prompt refined by AI!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate prompt. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className={`flex flex-col lg:flex-row gap-6 p-4 md:p-6 ${className}`}>
      {/* Left Column: Input Fields */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-100 to-blue-100 text-primary shadow-sm">
              <Wand2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Prompt Builder</h2>
              <p className="text-xs text-muted-foreground">CO-STAR Framework</p>
            </div>
          </div>
        </div>

        <div className="w-full space-y-3">
          {SECTIONS.map((section) => (
            <Accordion type="multiple" defaultValue={["core"]} key={section.id} className="w-full">
              <AccordionItem
                value={section.id}
                className={`border border-border rounded-xl ${section.bgColor} overflow-hidden shadow-sm transition-all duration-200 hover:shadow-md`}
              >
                <AccordionTrigger className="px-4 py-3.5 hover:bg-card/50 hover:no-underline transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-lg bg-card/80 ${section.iconColor}`}>
                      <section.icon className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-sm font-semibold text-foreground">{section.title}</h3>
                      <p className="text-[10px] text-muted-foreground font-normal mt-0.5">{section.description}</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 pt-2 space-y-4 bg-card/30">
                  {section.fields.map((field) => (
                    <div key={field.key} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label htmlFor={field.key} className="text-xs font-medium text-foreground">
                          {field.label}
                        </Label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="w-3.5 h-3.5 text-muted-foreground hover:text-primary transition-colors cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="text-xs">{field.description}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>

                      {field.type === 'textarea' ? (
                        <Textarea
                          id={field.key}
                          value={variables[field.key] || ""}
                          onChange={(e) => handleVariableChange(field.key, e.target.value)}
                          className="min-h-[90px] bg-card border-border focus:border-ring focus:ring-2 focus:ring-ring/20 transition-all resize-y text-sm"
                          placeholder={field.placeholder}
                        />
                      ) : field.type === 'select' ? (
                        <Select
                          value={variables[field.key] || field.defaultValue || ""}
                          onValueChange={(value) => handleVariableChange(field.key, value)}
                        >
                          <SelectTrigger className="w-full bg-card border-border focus:border-ring focus:ring-2 focus:ring-ring/20">
                            <SelectValue placeholder={field.placeholder} />
                          </SelectTrigger>
                          <SelectContent>
                            {field.options?.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          id={field.key}
                          value={variables[field.key] || ""}
                          onChange={(e) => handleVariableChange(field.key, e.target.value)}
                          className="bg-card border-border focus:border-ring focus:ring-2 focus:ring-ring/20 transition-all text-sm"
                          placeholder={field.placeholder}
                        />
                      )}
                    </div>
                  ))}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          ))}
        </div>
      </div>

      {/* Right Column: Preview */}
      <div className="flex-1 flex flex-col gap-4 min-w-0 border-t lg:border-t-0 lg:border-l border-border pt-4 lg:pt-0 lg:pl-6 lg:sticky lg:top-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 gap-2">
          {/* Toggle View */}
          <div className="flex p-1 bg-muted rounded-lg w-full sm:w-auto">
            <button
              onClick={() => setViewMode('template')}
              className={`flex-1 sm:flex-none px-3 py-1 text-xs font-medium rounded-md transition-all ${viewMode === 'template'
                  ? 'bg-white text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              <div className="flex items-center justify-center gap-1.5">
                <LayoutTemplate className="w-3.5 h-3.5" />
                Template
              </div>
            </button>
            <button
              onClick={() => setViewMode('result')}
              disabled={!refinedPrompt}
              className={`flex-1 sm:flex-none px-3 py-1 text-xs font-medium rounded-md transition-all ${viewMode === 'result'
                  ? 'bg-white text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed'
                }`}
            >
              <div className="flex items-center justify-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Result
              </div>
            </button>
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={copyToClipboard}
              className="flex-1 sm:flex-none h-8 text-xs gap-1.5 hover:bg-accent hover:text-accent-foreground transition-all"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy
            </Button>

            {viewMode === 'template' ? (
              <Button
                size="sm"
                onClick={handleGeneratePrompt}
                disabled={isGenerating}
                className="flex-1 sm:flex-none h-8 text-xs gap-1.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-sm transition-all"
              >
                {isGenerating ? (
                  <>
                    <Wand2 className="w-3.5 h-3.5 animate-spin" />
                    Refining...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-3.5 h-3.5 fill-current" />
                    Generate Prompt
                  </>
                )}
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => onUsePrompt && onUsePrompt(displayContent)}
                className="flex-1 sm:flex-none h-8 text-xs gap-1.5 bg-green-600 hover:bg-green-700 text-white shadow-sm transition-all"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Run Prompt
              </Button>
            )}
          </div>
        </div>

        <Card className="flex-1 overflow-hidden border-border shadow-sm bg-muted/30 relative min-h-[400px] md:min-h-[500px]">
          <div className="h-full p-4 md:p-6 text-sm text-foreground whitespace-pre-wrap font-mono leading-relaxed">
            {displayContent}
          </div>
          {/* Empty State Overlay */}
          {viewMode === 'template' && Object.values(variables).every(v => !v || v === "Plain Text" || v === "English") && (
            <div className="absolute inset-0 flex items-center justify-center bg-card/60 backdrop-blur-sm pointer-events-none">
              <div className="text-center p-6">
                <Wand2 className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  Fill in the fields on the left to generate a structured prompt.
                </p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
