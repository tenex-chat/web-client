import React from 'react';
import { NDKEvent } from '@nostr-dev-kit/ndk';
import {
  Dialog,
  DialogContent,
  DialogHeader,
} from '@/components/ui/dialog';
import { NostrProfile } from '@/components/common/NostrProfile';
import { formatRelativeTime } from '@/lib/utils/time';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';

interface EventModalProps {
  event: NDKEvent | null;
  isOpen: boolean;
  onClose: () => void;
}

export function EventModal({ event, isOpen, onClose }: EventModalProps) {
  if (!event) return null;

  const handleCopyEvent = () => {
    navigator.clipboard.writeText(event.encode());
    toast.success('Event ID copied');
  };

  // Get images from imeta tags (NIP-92)
  const getImetaImages = () => {
    const images: string[] = [];
    event.tags.forEach(tag => {
      if (tag[0] === 'imeta') {
        for (let i = 1; i < tag.length; i++) {
          if (tag[i].startsWith('url ')) {
            images.push(tag[i].substring(4));
          }
        }
      }
    });
    return images;
  };

  // Parse content for URLs and images
  const parseContent = (content: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const imageExtensions = /\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?[^\s]*)?$/i;

    const lines = content.split('\n');

    return lines.map((line, lineIndex) => {
      const parts = line.split(urlRegex);

      return (
        <React.Fragment key={lineIndex}>
          {parts.map((part, partIndex) => {
            // Check if this part is a URL
            if (urlRegex.test(part)) {
              // Reset regex lastIndex after test
              urlRegex.lastIndex = 0;

              // Check if it's an image URL
              if (imageExtensions.test(part)) {
                return (
                  <div key={partIndex} className="my-2">
                    <img
                      src={part}
                      alt="Image"
                      className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => window.open(part, '_blank')}
                      onError={(e) => {
                        // If image fails to load, show as link
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.insertAdjacentHTML(
                          'afterend',
                          `<a href="${part}" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">${part}</a>`
                        );
                      }}
                    />
                  </div>
                );
              }

              // Regular link
              return (
                <a
                  key={partIndex}
                  href={part}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {part}
                </a>
              );
            }

            // Regular text
            return <span key={partIndex}>{part}</span>;
          })}
          {lineIndex < lines.length - 1 && <br />}
        </React.Fragment>
      );
    });
  };

  const formattedContent = event.content ? parseContent(event.content) : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center gap-3">
            <NostrProfile
              pubkey={event.pubkey}
              variant="avatar"
              size="md"
            />
            <div>
              <NostrProfile
                pubkey={event.pubkey}
                variant="name"
                className="font-semibold"
              />
              <p className="text-xs text-muted-foreground">
                {formatRelativeTime(event.created_at || Math.floor(Date.now() / 1000))}
              </p>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="px-6 py-4">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <div className="whitespace-pre-wrap break-words text-sm">
                {formattedContent}
              </div>
            </div>

            {/* Show images from imeta tags */}
            {(() => {
              const imetaImages = getImetaImages();
              if (imetaImages.length > 0) {
                return (
                  <div className="mt-4 space-y-2">
                    {imetaImages.map((imageUrl, index) => (
                      <img
                        key={index}
                        src={imageUrl}
                        alt={`Image ${index + 1}`}
                        className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => window.open(imageUrl, '_blank')}
                        onError={(e) => {
                          // Hide broken images
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ))}
                  </div>
                );
              }
              return null;
            })()}

            {/* Show hashtags if present */}
            {event.tags.filter(tag => tag[0] === 't').length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {event.tags
                  .filter(tag => tag[0] === 't')
                  .map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-primary/10 text-primary"
                    >
                      #{tag[1]}
                    </span>
                  ))}
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex items-center px-6 py-3 border-t bg-muted/30">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyEvent}
            className="h-8"
          >
            <Copy className="h-3.5 w-3.5 mr-1.5" />
            Copy ID
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}