import DocumentEditClient from "./document-edit-client"

export default function EditDocumentPage({
  params,
}: {
  params: { id: string }
}) {
  return <DocumentEditClient documentId={params.id} />
} 