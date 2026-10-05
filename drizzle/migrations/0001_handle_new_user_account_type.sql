CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, username, account_type)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'username',
    CASE WHEN NEW.raw_user_meta_data->>'account_type' = 'agency' THEN 'agency' ELSE 'personal' END
  );
  RETURN NEW;
END;
$$;