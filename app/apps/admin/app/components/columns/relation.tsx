import { ExternalLinkIcon } from "lucide-react";
import { Link } from "react-router";
import { Badge } from "~/components/ui/badge";

interface RelationColumnProps {
  name: string;
  route: string;
}

export function RelationColumn({ name, route }: RelationColumnProps) {
  return (
    <Link to={route} className="block">
      <Badge
        variant="secondary"
        className="cursor-pointer hover:bg-secondary/80 transition-colors duration-200 group"
      >
        <span className="mr-1">{name}</span>
        <ExternalLinkIcon className="size-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
      </Badge>
    </Link>
  );
}
