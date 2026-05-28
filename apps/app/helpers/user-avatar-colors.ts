import {
  DEFAULT_FACTORY_COLOR,
  FACTORY_COLOR_OPTIONS,
  type FactoryColorValue,
  getFactoryColor,
} from "@/helpers/factory-colors";

export const USER_AVATAR_COLOR_OPTIONS = FACTORY_COLOR_OPTIONS;

export type UserAvatarColorValue = FactoryColorValue;

export const DEFAULT_USER_AVATAR_COLOR =
  DEFAULT_FACTORY_COLOR satisfies UserAvatarColorValue;

export function getUserAvatarColor(value: unknown): UserAvatarColorValue {
  return getFactoryColor(value);
}
