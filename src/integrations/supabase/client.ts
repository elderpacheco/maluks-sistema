// src/integrations/supabase/client.ts
// Este arquivo cria o cliente do Supabase para o app.

import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

// 1) Lê do .env (Vite): VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
const envUrl  = import.meta.env.VITE_SUPABASE_URL as string | undefined
const envKey  = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

// 2) Fallback (opcional): se faltar .env, usa os valores abaixo.
//    >>> Você pode remover estes fallbacks se preferir forçar o uso do .env.
const FALLBACK_URL = "https://bvpzcteslcjkckcphbmr.supabase.co"
const FALLBACK_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2cHpjdGVzbGNqa2NrY3BoYm1yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2NjA4NDAsImV4cCI6MjA3MDIzNjg0MH0._1Ll4Lqp6wvqgkI7h0WadGu2Y5hPZ8Rxo4cwxahwUwc"

// 3) Escolhe o que usar
const SUPABASE_URL = envUrl || FALLBACK_URL
const SUPABASE_ANON_KEY = envKey || FALLBACK_ANON_KEY

if (!envUrl || !envKey) {
  console.warn(
    '[supabase] Usando credenciais de fallback porque .env não foi encontrado ou está incompleto. ' +
    'Crie/edite o arquivo .env na raiz com VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.'
  )
}

// 4) Cria o client
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
})
