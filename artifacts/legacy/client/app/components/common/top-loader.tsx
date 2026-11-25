import { useEffect, useRef } from "react";
import { useNavigation } from "react-router";
import type { LoadingBarRef } from "react-top-loading-bar";
import LoadingBar from "react-top-loading-bar";

export function TopLoader() {
  const navigation = useNavigation();
  const ref = useRef<LoadingBarRef>(null);

  useEffect(() => {
    if (navigation.state === "loading" || navigation.state === "submitting") {
      ref.current?.continuousStart();
    }

    if (navigation.state === "idle") {
      ref.current?.complete();
    }
  }, [navigation.state]);

  return (
    <LoadingBar
      ref={ref}
      color="#e86337"
      shadow={false}
      height={2}
      transitionTime={100}
      waitingTime={300}
    />
  );
}
