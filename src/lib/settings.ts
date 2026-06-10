import { cache } from "react";
import { db } from "@/lib/db";

export const getSettings = cache(() => db.appSettings.findUniqueOrThrow({ where: { id: 1 } }));
