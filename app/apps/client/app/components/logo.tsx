/** Site wordmark — same asset as the tab icon (`FAVICON_HREF`). */
import { FAVICON_HREF } from "~/lib/favicon-href";

export default function Logo(props: React.ImgHTMLAttributes<HTMLImageElement>) {
  const { className, alt = "Legacy", ...rest } = props;
  return (
    <img
      src={FAVICON_HREF}
      alt={alt}
      className={className}
      {...rest}
    />
  );
}
