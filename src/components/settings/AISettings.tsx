import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { LLMSettings } from './LLMSettings';
import { TTSSettings } from './TTSSettings';
import { STTSettings } from './STTSettings';

export function AISettings() {
  return (
    <div className="space-y-8">
      {/* LLM Settings Section */}
      <Card>
        <CardHeader>
          <CardTitle>Language Models (LLM)</CardTitle>
          <CardDescription>
            Configure the AI language models used for conversations and agents
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LLMSettings />
        </CardContent>
      </Card>

      <Separator />

      {/* TTS Settings Section */}
      <Card>
        <CardHeader>
          <CardTitle>Text-to-Speech (TTS)</CardTitle>
          <CardDescription>
            Configure voice synthesis settings for AI responses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TTSSettings />
        </CardContent>
      </Card>

      <Separator />

      {/* STT Settings Section */}
      <Card>
        <CardHeader>
          <CardTitle>Speech-to-Text (STT)</CardTitle>
          <CardDescription>
            Configure voice recognition settings for input
          </CardDescription>
        </CardHeader>
        <CardContent>
          <STTSettings />
        </CardContent>
      </Card>
    </div>
  );
}