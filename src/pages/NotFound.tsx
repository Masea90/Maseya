import { useLocation, Navigate } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.warn("404: redirecting to / from", location.pathname);
  }, [location.pathname]);

  // Preserve URL hash and search — they may carry OAuth tokens
  // (#access_token=..., ?code=...) that the auth client needs to consume.
  const target = `/${location.search || ''}${location.hash || ''}`;
  return <Navigate to={target} replace />;
};

export default NotFound;
