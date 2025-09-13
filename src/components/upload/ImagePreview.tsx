import { useState, useEffect } from "react";
import { Download, ExternalLink, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { decode } from "blurhash";

interface ImagePreviewProps {
  url: string;
  alt?: string;
  blurhash?: string;
  width?: number;
  height?: number;
  className?: string;
  onClick?: () => void;
  showLightbox?: boolean;
}

export function ImagePreview({
  url,
  alt = "Image",
  blurhash,
  width,
  height,
  className,
  onClick,
  showLightbox = true,
}: ImagePreviewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [blurhashUrl, setBlurhashUrl] = useState<string | null>(null);

  // Generate blurhash preview
  useEffect(() => {
    if (!blurhash) return;

    try {
      // Decode blurhash to pixels
      const pixels = decode(blurhash, 32, 32);

      // Create canvas and draw pixels
      const canvas = document.createElement("canvas");
      canvas.width = 32;
      canvas.height = 32;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const imageData = ctx.createImageData(32, 32);
      imageData.data.set(pixels);
      ctx.putImageData(imageData, 0, 0);

      // Convert to data URL
      setBlurhashUrl(canvas.toDataURL());
    } catch (error) {
      console.error("Failed to decode blurhash:", error);
    }
  }, [blurhash]);

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setIsError(true);
  };

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (showLightbox && !isError) {
      setIsLightboxOpen(true);
    }
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = alt || "image";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error("Failed to download image:", error);
    }
  };

  const openInNewTab = () => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      <div
        className={cn(
          "relative overflow-hidden rounded-lg bg-muted cursor-pointer",
          className,
        )}
        onClick={handleClick}
        style={{
          aspectRatio: width && height ? `${width}/${height}` : undefined,
        }}
      >
        {/* Blurhash placeholder */}
        {blurhashUrl && isLoading && (
          <img
            src={blurhashUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover filter blur-lg scale-110"
            aria-hidden="true"
          />
        )}

        {/* Loading indicator */}
        {isLoading && !blurhashUrl && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Error state */}
        {isError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
            <X className="w-8 h-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground text-center">
              Failed to load image
            </p>
            <Button
              variant="link"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                openInNewTab();
              }}
              className="mt-2"
            >
              Open in new tab
            </Button>
          </div>
        )}

        {/* Actual image */}
        <img
          src={url}
          alt={alt}
          className={cn(
            "w-full h-full object-cover transition-opacity duration-300",
            isLoading ? "opacity-0" : "opacity-100",
          )}
          onLoad={handleImageLoad}
          onError={handleImageError}
          loading="lazy"
        />

        {/* Hover overlay */}
        {!isError && !isLoading && (
          <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button
              variant="secondary"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                handleDownload();
              }}
              className="h-8 w-8"
            >
              <Download className="w-4 h-4" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                openInNewTab();
              }}
              className="h-8 w-8"
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {showLightbox && (
        <Dialog open={isLightboxOpen} onOpenChange={setIsLightboxOpen}>
          <DialogContent className="max-w-[90vw] max-h-[90vh] p-0">
            <DialogHeader className="p-4 pb-0">
              <DialogTitle className="flex items-center justify-between">
                <span>{alt}</span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleDownload}
                    className="h-8 w-8"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={openInNewTab}
                    className="h-8 w-8"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </DialogTitle>
            </DialogHeader>
            <div className="p-4 pt-0">
              <img
                src={url}
                alt={alt}
                className="w-full h-full max-h-[calc(90vh-100px)] object-contain"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
