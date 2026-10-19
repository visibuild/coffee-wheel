import {
  boolean,
  doublePrecision,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export type Emoji =
  | { kind: "native"; value: string }
  | { kind: "slack"; name: string; url: string };

const createdAt = () => timestamp("created_at", { withTimezone: true }).defaultNow();

export const people = pgTable("people", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  weight: doublePrecision("weight").notNull(),
  color: text("color"),
  emoji: jsonb("emoji").$type<Emoji>(),
  active: boolean("active").notNull().default(true),
  createdAt: createdAt(),
});

export const admins = pgTable("admins", {
  email: text("email").primaryKey(),
  addedBy: text("added_by"),
  createdAt: createdAt(),
});

export const spins = pgTable("spins", {
  id: serial("id").primaryKey(),
  winnerId: integer("winner_id")
    .notNull()
    .references(() => people.id),
  spunBy: text("spun_by").notNull(),
  // winner's share before halving
  chance: doublePrecision("chance").notNull(),
  createdAt: createdAt(),
  undoneAt: timestamp("undone_at", { withTimezone: true }),
  undoneBy: text("undone_by"),
  slackChannel: text("slack_channel"),
  slackFileId: text("slack_file_id"),
  slackTs: text("slack_ts"),
});

export const weightChanges = pgTable("weight_changes", {
  id: serial("id").primaryKey(),
  personId: integer("person_id")
    .notNull()
    .references(() => people.id),
  oldShare: doublePrecision("old_share").notNull(),
  newShare: doublePrecision("new_share").notNull(),
  changedBy: text("changed_by").notNull(),
  createdAt: createdAt(),
});

export const slackEmojis = pgTable("slack_emojis", {
  name: text("name").primaryKey(),
  url: text("url").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export type Person = typeof people.$inferSelect;
export type SpinRow = typeof spins.$inferSelect;
export type WeightChangeRow = typeof weightChanges.$inferSelect;
