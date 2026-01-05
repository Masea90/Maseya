-- Create function to generate notifications for likes
CREATE OR REPLACE FUNCTION public.create_like_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  post_owner_id UUID;
  liker_nickname TEXT;
BEGIN
  -- Get the post owner
  SELECT user_id INTO post_owner_id
  FROM public.community_posts
  WHERE id = NEW.post_id;
  
  -- Don't notify if user liked their own post
  IF post_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  
  -- Get liker's nickname
  SELECT nickname INTO liker_nickname
  FROM public.profiles
  WHERE user_id = NEW.user_id;
  
  -- Create notification
  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    post_owner_id,
    'like',
    'New like on your post',
    COALESCE(liker_nickname, 'Someone') || ' liked your post',
    jsonb_build_object('post_id', NEW.post_id, 'user_id', NEW.user_id)
  );
  
  RETURN NEW;
END;
$$;

-- Create function to generate notifications for comments
CREATE OR REPLACE FUNCTION public.create_comment_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  post_owner_id UUID;
  commenter_nickname TEXT;
BEGIN
  -- Get the post owner
  SELECT user_id INTO post_owner_id
  FROM public.community_posts
  WHERE id = NEW.post_id;
  
  -- Don't notify if user commented on their own post
  IF post_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  
  -- Get commenter's nickname
  SELECT nickname INTO commenter_nickname
  FROM public.profiles
  WHERE user_id = NEW.user_id;
  
  -- Create notification
  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    post_owner_id,
    'comment',
    'New comment on your post',
    COALESCE(commenter_nickname, 'Someone') || ' commented on your post',
    jsonb_build_object('post_id', NEW.post_id, 'comment_id', NEW.id, 'user_id', NEW.user_id)
  );
  
  RETURN NEW;
END;
$$;

-- Create triggers
CREATE TRIGGER trigger_like_notification
AFTER INSERT ON public.post_likes
FOR EACH ROW
EXECUTE FUNCTION public.create_like_notification();

CREATE TRIGGER trigger_comment_notification
AFTER INSERT ON public.post_comments
FOR EACH ROW
EXECUTE FUNCTION public.create_comment_notification();