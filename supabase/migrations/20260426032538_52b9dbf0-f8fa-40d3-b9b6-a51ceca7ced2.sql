
-- User preferences: single row per user, JSONB blob.
-- Stores: theme, dashboard layout, widget order/visibility, chart palette/sizes,
-- notification prefs, cookie consent, sidebar order, and read notifications log.

CREATE TABLE public.user_preferences (
  user_id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  prefs jsonb NOT NULL DEFAULT '{}'::jsonb,
  notifications jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences"
  ON public.user_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON public.user_preferences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON public.user_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own preferences"
  ON public.user_preferences FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Notification preferences default
COMMENT ON COLUMN public.user_preferences.prefs IS
  'Single JSONB blob of user UI preferences: theme, colorMode, dashboardOrder, widgetOrder, widgetVisibility, chartVisibility, chartPalette, chartSizes, sidebarOrder, notifPrefs, cookiePrefs, lastTapEmailDigestAt';

COMMENT ON COLUMN public.user_preferences.notifications IS
  'Array of in-app notifications: [{id, type, title, message, read, createdAt, meta}]. Capped to 50 most recent server-side.';
