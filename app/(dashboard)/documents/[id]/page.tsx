import { use } from "react"
import DocumentClient from "./document-client"

// This is a server component that handles the params
export default async function DocumentPage({
  params,
}: {
  params: { id: string }
}) {
  // Pass the id directly to the client component
  return <DocumentClient id={params.id} />
}

