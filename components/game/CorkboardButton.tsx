"use client";

import { Button } from "@/components/ui/Button";

export function CorkboardButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="tab" onClick={onClick}>
      Prikbord
    </Button>
  );
}
