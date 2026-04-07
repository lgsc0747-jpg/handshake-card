CREATE OR REPLACE FUNCTION public.hash_persona_pin()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  IF NEW.pin_code IS NOT NULL AND NEW.pin_code != '' THEN
    IF left(NEW.pin_code, 4) != '$2a$' AND left(NEW.pin_code, 4) != '$2b$' THEN
      NEW.pin_code := crypt(NEW.pin_code, gen_salt('bf'));
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;