import type { RouteConfig } from "@react-router/dev/routes";
import { index, layout, prefix, route } from "@react-router/dev/routes";

export default [
  ...prefix(":locale?", [
    layout("components/layouts/admin.tsx", [
      ...prefix("users", [
        index("routes/admin/users/index.tsx"),
        route("create", "routes/admin/users/create.tsx"),
        route(":userId/edit", "routes/admin/users/edit.tsx"),
      ]),

      ...prefix("accueil", [
        index("routes/admin/accueil/index.tsx"),
      ]),

      ...prefix("profile", [
        index("routes/admin/profile/index.tsx"),
      ]),

//       ...prefix("transport-plannings", [
//         index("routes/admin/transport-plannings/index.tsx"),
//         route("create", "routes/admin/transport-plannings/create.tsx"),
//         route(
//           ":transportPlanningId/edit",
//           "routes/admin/transport-plannings/edit.tsx",
//         ),
//       ]),

//       ...prefix("vehicle-types", [
//         index("routes/admin/vehicle-types/index.tsx"),
//         route("create", "routes/admin/vehicle-types/create.tsx"),
//         route(":vehicleTypeId/edit", "routes/admin/vehicle-types/edit.tsx"),
//       ]),

//       ...prefix("vehicles", [
//         index("routes/admin/vehicles/index.tsx"),
//         route("create", "routes/admin/vehicles/create.tsx"),
//         route(":vehicleId/edit", "routes/admin/vehicles/edit.tsx"),
//       ]),

      // ...prefix("providers", [
      //   index("routes/admin/providers/index.tsx"),
      //   route("create", "routes/admin/providers/create.tsx"),
      //   route(":providerId/edit", "routes/admin/providers/edit.tsx"),
      // ]),

      



 // END
      // DON'T REMOVE END COMMENT BECAUSE IT IS USED TO GENERATE SAFE ROUTES
    ]),
  ]),
] satisfies RouteConfig;
