"use client";

import { Component, type ReactNode } from "react";

import { Button } from "@/components/ui/button";

type DecksErrorBoundaryProps = {
  children: ReactNode;
};

type DecksErrorBoundaryState = {
  error: Error | null;
};

/**
 * Catches errors thrown by reactive Convex queries underneath it (a failing
 * query surfaces as a render error) so one bad fetch doesn't blank the page.
 * Resetting `error` re-renders children, which resubscribes the queries.
 */
export class DecksErrorBoundary extends Component<
  DecksErrorBoundaryProps,
  DecksErrorBoundaryState
> {
  state: DecksErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): DecksErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("Decks data failed to load:", error);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div
        role="alert"
        className="bg-destructive/10 text-destructive ring-destructive/20 rounded-xl p-4 text-sm ring-1"
      >
        <p className="font-medium">Something went wrong loading deck data.</p>
        <p className="mt-1 opacity-80">{error.message}</p>
        <div className="mt-3">
          <Button variant="outline" size="sm" onClick={() => this.setState({ error: null })}>
            Try again
          </Button>
        </div>
      </div>
    );
  }
}
