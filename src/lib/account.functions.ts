import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'

const schema = z.object({
  confirm: z.literal('EXCLUIR'),
})

export const deleteMyAccount = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ context }) => {
    const { userId } = context
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')

    // Best-effort cleanup of user-owned rows (RLS-bypassing admin client).
    // Auth cascade handles most FKs (profiles/user_roles/links/etc. reference auth.users on delete cascade),
    // but we also remove the avatar from Storage explicitly.
    try {
      await supabaseAdmin.storage.from('avatars').remove([`${userId}.jpg`])
    } catch (e) {
      console.warn('[deleteMyAccount] avatar remove failed', e)
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (error) {
      console.error('[deleteMyAccount] auth delete failed', error)
      throw new Error('Não foi possível excluir sua conta. Tente novamente ou contate o suporte.')
    }

    return { deleted: true as const }
  })
