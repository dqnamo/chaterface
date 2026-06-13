import type { ReactNode } from "react";
import {
	ActivityIndicator,
	Pressable,
	StyleSheet,
	Text,
	TextInput,
	type TextInputProps,
	View,
	type ViewStyle,
} from "react-native";
import { colors, spacing } from "../theme";
import type { TaskDotStatus } from "../utils/task-status";

const LOGO_PATTERN = [
	false,
	true,
	true,
	true,
	false,
	false,
	false,
	true,
	false,
	true,
	false,
	false,
] as const;
const LOGO_KEYS = LOGO_PATTERN.map(
	(_cell, index) => `factoryplane-logo-cell-${index}`,
);

const monogramColors = [
	{ background: colors.red9, foreground: colors.red2 },
	{ background: colors.green9, foreground: colors.green2 },
	{ background: colors.blue9, foreground: colors.blue2 },
] as const;

function hashSeed(seed: string): number {
	let hash = 0;
	for (let index = 0; index < seed.length; index += 1) {
		hash = (hash << 5) - hash + seed.charCodeAt(index);
		hash |= 0;
	}
	return Math.abs(hash);
}

export function Logo({ size = 8 }: { size?: number }) {
	return (
		<View style={[styles.logo, { width: size * 3 }]}>
			{LOGO_PATTERN.map((isFilled, index) => (
				<View
					key={LOGO_KEYS[index]}
					style={[
						{ width: size, height: size },
						isFilled ? styles.logoCellFilled : styles.logoCellEmpty,
					]}
				/>
			))}
		</View>
	);
}

export function Monogram({
	seed = "",
	letters = 2,
	size = 40,
}: {
	seed?: string;
	letters?: number;
	size?: number;
}) {
	const palette = monogramColors[hashSeed(seed) % monogramColors.length];

	return (
		<View
			style={[
				styles.monogram,
				{
					width: size,
					height: size,
					backgroundColor: palette.background,
				},
			]}
		>
			<Text style={[styles.monogramText, { color: palette.foreground }]}>
				{seed.slice(0, letters).toUpperCase()}
			</Text>
		</View>
	);
}

export function CornerBrackets({
	color = colors.accent9,
	size = 8,
	inset = 0,
}: {
	color?: string;
	size?: number;
	inset?: number;
}) {
	const cornerStyle = {
		width: size,
		height: size,
		borderColor: color,
	};

	return (
		<View pointerEvents="none" style={styles.absoluteFill}>
			<View
				style={[
					styles.corner,
					cornerStyle,
					styles.cornerTopLeft,
					{ top: inset, left: inset },
				]}
			/>
			<View
				style={[
					styles.corner,
					cornerStyle,
					styles.cornerTopRight,
					{ top: inset, right: inset },
				]}
			/>
			<View
				style={[
					styles.corner,
					cornerStyle,
					styles.cornerBottomLeft,
					{ bottom: inset, left: inset },
				]}
			/>
			<View
				style={[
					styles.corner,
					cornerStyle,
					styles.cornerBottomRight,
					{ bottom: inset, right: inset },
				]}
			/>
		</View>
	);
}

export function Screen({ children }: { children: ReactNode }) {
	return <View style={styles.screen}>{children}</View>;
}

export function CenterShell({ children }: { children: ReactNode }) {
	return <View style={styles.centerShell}>{children}</View>;
}

export function Panel({
	children,
	style,
}: {
	children: ReactNode;
	style?: ViewStyle;
}) {
	return (
		<View style={[styles.panel, style]}>
			<CornerBrackets color={colors.grayscale6} size={7} inset={-1} />
			{children}
		</View>
	);
}

export function SectionLabel({
	label,
	description,
}: {
	label: string;
	description?: string;
}) {
	return (
		<View style={styles.sectionLabel}>
			<Text style={styles.label}>{label}</Text>
			{description ? (
				<Text style={styles.description}>{description}</Text>
			) : null}
		</View>
	);
}

export function Field(props: TextInputProps & { multiline?: boolean }) {
	return (
		<TextInput
			placeholderTextColor={colors.grayscale10}
			selectionColor={colors.accent9}
			{...props}
			style={[
				styles.input,
				props.multiline ? styles.textarea : undefined,
				props.style,
			]}
		/>
	);
}

export function Button({
	children,
	variant = "primary",
	disabled,
	onPress,
	icon,
}: {
	children: ReactNode;
	variant?: "primary" | "secondary" | "danger" | "ghost";
	disabled?: boolean;
	onPress?: () => void;
	icon?: ReactNode;
}) {
	return (
		<Pressable
			disabled={disabled}
			onPress={onPress}
			style={({ pressed }) => [
				styles.button,
				buttonVariantStyles[variant],
				disabled ? styles.disabled : undefined,
				pressed && !disabled ? styles.pressed : undefined,
			]}
		>
			{variant === "primary" ? (
				<CornerBrackets color={colors.grayscale12} size={7} inset={-4} />
			) : null}
			{icon}
			<Text
				style={[
					styles.buttonText,
					variant === "primary" ? styles.primaryButtonText : undefined,
					variant === "danger" ? styles.dangerButtonText : undefined,
				]}
			>
				{children}
			</Text>
		</Pressable>
	);
}

export function ListRow({
	children,
	onPress,
	selected,
	icon,
}: {
	children: ReactNode;
	onPress?: () => void;
	selected?: boolean;
	icon?: ReactNode;
}) {
	return (
		<Pressable
			onPress={onPress}
			style={({ pressed }) => [
				styles.row,
				selected ? styles.rowSelected : undefined,
				pressed ? styles.rowPressed : undefined,
			]}
		>
			<CornerBrackets
				color={selected ? colors.accent9 : colors.grayscale8}
				size={7}
				inset={0}
			/>
			{icon}
			<View style={styles.rowContent}>{children}</View>
		</Pressable>
	);
}

export function TaskStatusDots({
	status,
	size = 3,
	gap = 1,
}: {
	status: TaskDotStatus;
	size?: number;
	gap?: number;
}) {
	const fillColor =
		status === "failed"
			? colors.red9
			: status === "running"
				? colors.accent9
				: colors.green9;

	return (
		<View style={[styles.dots, { gap }]}>
			{[0, 1, 2, 3, 4, 5].map((index) => (
				<View
					key={`dot-${index}`}
					style={{
						width: size,
						height: size,
						opacity: status === "running" ? 0.35 + (index % 3) * 0.2 : 1,
						backgroundColor: fillColor,
					}}
				/>
			))}
		</View>
	);
}

export function LoadingState({ label }: { label: string }) {
	return (
		<CenterShell>
			<Logo size={6} />
			<ActivityIndicator color={colors.accent9} />
			<Text style={styles.mutedText}>{label}</Text>
		</CenterShell>
	);
}

export function ErrorState({ message }: { message: string }) {
	return (
		<CenterShell>
			<Logo size={6} />
			<Text style={styles.title}>Unable to load</Text>
			<Text style={[styles.mutedText, { color: colors.red11 }]}>{message}</Text>
		</CenterShell>
	);
}

const buttonVariantStyles = StyleSheet.create({
	primary: {
		backgroundColor: colors.grayscale12,
	},
	secondary: {
		backgroundColor: colors.grayscale3,
	},
	danger: {
		backgroundColor: colors.red3,
	},
	ghost: {
		backgroundColor: "transparent",
	},
});

export const textStyles = StyleSheet.create({
	title: {
		color: colors.grayscale12,
		fontSize: 18,
		fontWeight: "600",
	},
	heading: {
		color: colors.grayscale12,
		fontSize: 15,
		fontWeight: "600",
	},
	body: {
		color: colors.grayscale11,
		fontSize: 14,
		lineHeight: 20,
	},
	caption: {
		color: colors.grayscale10,
		fontSize: 12,
		lineHeight: 16,
	},
	mono: {
		color: colors.grayscale10,
		fontFamily: "Courier",
		fontSize: 11,
		fontWeight: "700",
		textTransform: "uppercase",
	},
});

const styles = StyleSheet.create({
	screen: {
		flex: 1,
		backgroundColor: colors.grayscale1,
	},
	centerShell: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		gap: spacing.lg,
		padding: spacing.lg,
		backgroundColor: colors.grayscale1,
	},
	logo: {
		flexDirection: "row",
		flexWrap: "wrap",
	},
	logoCellFilled: {
		backgroundColor: colors.accent9,
	},
	logoCellEmpty: {
		backgroundColor: "transparent",
	},
	monogram: {
		alignItems: "center",
		justifyContent: "center",
	},
	monogramText: {
		fontSize: 14,
		fontWeight: "600",
	},
	corner: {
		position: "absolute",
	},
	absoluteFill: {
		position: "absolute",
		top: 0,
		right: 0,
		bottom: 0,
		left: 0,
	},
	cornerTopLeft: {
		borderLeftWidth: 1,
		borderTopWidth: 1,
	},
	cornerTopRight: {
		borderRightWidth: 1,
		borderTopWidth: 1,
	},
	cornerBottomLeft: {
		borderBottomWidth: 1,
		borderLeftWidth: 1,
	},
	cornerBottomRight: {
		borderBottomWidth: 1,
		borderRightWidth: 1,
	},
	panel: {
		position: "relative",
		borderColor: colors.grayscale4,
		borderWidth: StyleSheet.hairlineWidth,
		backgroundColor: colors.grayscale1,
	},
	sectionLabel: {
		gap: 2,
	},
	label: {
		color: colors.grayscale11,
		fontSize: 12,
	},
	description: {
		color: colors.grayscale10,
		fontSize: 12,
		lineHeight: 16,
	},
	input: {
		minHeight: 38,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: colors.grayscale5,
		backgroundColor: colors.grayscale2,
		color: colors.grayscale12,
		fontSize: 14,
		paddingHorizontal: spacing.md,
		paddingVertical: spacing.sm,
	},
	textarea: {
		minHeight: 112,
		textAlignVertical: "top",
	},
	button: {
		position: "relative",
		minHeight: 34,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: spacing.sm,
		paddingHorizontal: spacing.md,
		paddingVertical: spacing.sm,
	},
	buttonText: {
		color: colors.grayscale12,
		fontSize: 13,
		fontWeight: "600",
	},
	primaryButtonText: {
		color: colors.grayscale1,
	},
	dangerButtonText: {
		color: colors.red11,
	},
	disabled: {
		opacity: 0.5,
	},
	pressed: {
		transform: [{ scale: 0.98 }],
	},
	row: {
		position: "relative",
		minHeight: 52,
		flexDirection: "row",
		alignItems: "center",
		gap: spacing.md,
		paddingHorizontal: spacing.md,
		paddingVertical: spacing.sm,
		backgroundColor: colors.grayscale1,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: colors.grayscale4,
	},
	rowSelected: {
		backgroundColor: colors.grayscale3,
	},
	rowPressed: {
		backgroundColor: colors.grayscale2,
	},
	rowContent: {
		flex: 1,
		minWidth: 0,
		gap: 2,
	},
	dots: {
		width: 7,
		flexDirection: "row",
		flexWrap: "wrap",
	},
	title: textStyles.title,
	mutedText: {
		...textStyles.body,
		textAlign: "center",
	},
});
