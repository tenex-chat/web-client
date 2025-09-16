import React, { memo, useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface ReactComponentRendererProps {
  componentCode: string;
  props?: Record<string, any>;
}

/**
 * Dynamically renders React components from JavaScript code strings.
 * The code must use React.createElement() and define a component named `ReactComponent`.
 */
export const ReactComponentRenderer = memo(function ReactComponentRenderer({
  componentCode,
  props = {},
}: ReactComponentRendererProps) {
  const [Component, setComponent] = useState<React.ComponentType | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      // Reset error state
      setError(null);

      // Create a function that evaluates the component code
      // The code should define a component named ReactComponent
      const evalCode = `
        (function() {
          ${componentCode}
          return typeof ReactComponent !== 'undefined' ? ReactComponent : null;
        })()
      `;

      // Evaluate the code to get the component
      const evaluatedComponent = eval(evalCode);

      if (!evaluatedComponent) {
        setError("ReactComponent not found in the provided code");
        setComponent(null);
        return;
      }

      // Validate that it's a valid React component
      if (typeof evaluatedComponent !== 'function' && 
          (typeof evaluatedComponent !== 'object' || !evaluatedComponent.$$typeof)) {
        setError("The evaluated code does not return a valid React component");
        setComponent(null);
        return;
      }

      setComponent(() => evaluatedComponent);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Failed to evaluate component: ${errorMessage}`);
      setComponent(null);
    }
  }, [componentCode]);

  if (error) {
    return (
      <Alert variant="destructive" className="my-2">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!Component) {
    return (
      <div className="flex items-center justify-center p-4 text-muted-foreground">
        <span className="text-sm">Loading component...</span>
      </div>
    );
  }

  try {
    return <Component {...props} />;
  } catch (renderError) {
    const errorMessage = renderError instanceof Error ? renderError.message : String(renderError);
    return (
      <Alert variant="destructive" className="my-2">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Component render error: {errorMessage}</AlertDescription>
      </Alert>
    );
  }
});