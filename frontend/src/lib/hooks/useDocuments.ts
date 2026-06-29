import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  changeDocumentStatus,
  createDocument,
  deleteDocument,
  editDocument,
  getDocument,
  getDocuments,
} from '@/lib/api/documents'
import type { ChangeStatusRequest, CreateDocumentRequest, Document, EditDocumentRequest } from '@/lib/types/documents'

const documentsKey = ['documents'] as const
const documentKey = (id: string) => ['documents', id] as const

export function useDocuments() {
  return useQuery({ queryKey: documentsKey, queryFn: getDocuments })
}

export function useDocument(id: string) {
  return useQuery({
    queryKey: documentKey(id),
    queryFn: () => getDocument(id),
    enabled: Boolean(id),
  })
}

export function useCreateDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateDocumentRequest) => createDocument(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentsKey })
    },
  })
}

export function useEditDocument(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: EditDocumentRequest) => editDocument(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentKey(id) })
      queryClient.invalidateQueries({ queryKey: documentsKey })
    },
  })
}

export function useChangeDocumentStatus(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: ChangeStatusRequest) => changeDocumentStatus(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentKey(id) })
      queryClient.invalidateQueries({ queryKey: documentsKey })
    },
  })
}

export function useDeleteDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteDocument(id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: documentsKey })
      const previous = queryClient.getQueryData<Document[]>(documentsKey)
      queryClient.setQueryData<Document[]>(documentsKey, (old) =>
        old?.filter((doc) => doc.id !== id)
      )
      return { previous }
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(documentsKey, context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: documentsKey })
    },
  })
}
