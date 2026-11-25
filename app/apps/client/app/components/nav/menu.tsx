import {
  BedDouble,
  Calendar,
  Car,
  Home,
  PlusCircle,
  Utensils,
  UtensilsCrossed,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "~/components/ui/navigation-menu";
import { SAFE_ROUTES } from "~/safe-routes";
import { Button } from "../ui/button";

export function MainClientMenu() {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <NavigationMenu>
        <NavigationMenuList>
          
        </NavigationMenuList>
      </NavigationMenu>
    </div>
  );
}
