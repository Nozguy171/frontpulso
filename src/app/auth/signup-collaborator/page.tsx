import { Suspense } from "react"
import SignupCollaboratorClient from "./signup-collaborator-client"

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background px-4 py-10">
          <div className="text-sm text-muted-foreground">Cargando…</div>
        </div>
      }
    >
      <SignupCollaboratorClient />
    </Suspense>
  )
}