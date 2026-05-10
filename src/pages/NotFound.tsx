import { useLocation, Navigate } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.warn("404: redirecting to / from", location.pathname);
  }, [location.pathname]);

  return <Navigate to="/" replace />;
};

export default NotFound;
