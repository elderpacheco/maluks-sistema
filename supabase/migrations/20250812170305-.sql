-- Criar o usuário padrão Maluks diretamente na tabela auth.users
-- Primeiro verificar se já existe um usuário com esse email
DO $$
DECLARE
    user_exists BOOLEAN;
    new_user_id UUID;
BEGIN
    -- Verificar se o usuário já existe
    SELECT EXISTS (SELECT 1 FROM auth.users WHERE email = 'maluks@maluks.local') INTO user_exists;
    
    IF NOT user_exists THEN
        -- Gerar um UUID para o novo usuário
        new_user_id := gen_random_uuid();
        
        -- Inserir o usuário na tabela auth.users
        INSERT INTO auth.users (
            id,
            instance_id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            invited_at,
            confirmation_token,
            confirmation_sent_at,
            recovery_token,
            recovery_sent_at,
            email_change_token_new,
            email_change,
            email_change_sent_at,
            last_sign_in_at,
            raw_app_meta_data,
            raw_user_meta_data,
            is_super_admin,
            created_at,
            updated_at,
            phone,
            phone_confirmed_at,
            phone_change,
            phone_change_token,
            phone_change_sent_at,
            email_change_token_current,
            email_change_confirm_status,
            banned_until,
            reauthentication_token,
            reauthentication_sent_at
        ) VALUES (
            new_user_id,
            '00000000-0000-0000-0000-000000000000',
            'authenticated',
            'authenticated',
            'maluks@maluks.local',
            crypt('88715000', gen_salt('bf')), -- Hash da senha 88715000
            now(),
            null,
            '',
            null,
            '',
            null,
            '',
            '',
            null,
            null,
            '{"provider": "email", "providers": ["email"]}',
            '{"nome": "Maluks", "usuario": "Maluks"}',
            false,
            now(),
            now(),
            null,
            null,
            '',
            '',
            null,
            '',
            0,
            null,
            '',
            null
        );
        
        -- Inserir o perfil correspondente
        INSERT INTO public.profiles (user_id, nome, email)
        VALUES (new_user_id, 'Maluks', 'maluks@maluks.local');
        
        RAISE NOTICE 'Usuário Maluks criado com sucesso';
    ELSE
        RAISE NOTICE 'Usuário Maluks já existe';
    END IF;
END $$;