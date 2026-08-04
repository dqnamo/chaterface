import { Link, useRouter } from "expo-router";
import {
	Building2,
	ChevronRight,
	LogOut,
	type LucideIcon,
} from "lucide-react-native";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { Icon } from "@/components/icon";
import db from "@/lib/instant";
import { useWorkspace } from "@/lib/workspace";
import { cn } from "@/utils/tailwind";

export default function SettingsScreen() {
	const router = useRouter();
	const { user } = db.useAuth();
	const { workspace, workspaces } = useWorkspace();

	const signOut = () => {
		Alert.alert("Sign out", "Sign out of Chaterface on this device?", [
			{ text: "Cancel", style: "cancel" },
			{
				text: "Sign out",
				style: "destructive",
				onPress: () => {
					void db.auth.signOut();
					router.dismissAll();
				},
			},
		]);
	};

	return (
		<ScrollView
			className="flex-1 bg-background"
			contentInsetAdjustmentBehavior="automatic"
			contentContainerClassName="android:pb-safe"
		>
			<View className="mx-5 mt-4 mb-5 bg-muted rounded-xl px-4 py-3 border-continuous">
				<Text className="text-[13px] text-muted-foreground">Signed in as</Text>
				<Text selectable className="text-[15px] text-foreground">
					{user?.email ?? "Unknown"}
				</Text>
			</View>

			<Text className="px-5 pb-1.5 text-[13px] font-semibold text-muted-foreground">
				Workspace
			</Text>
			<SettingsRow
				detail={workspace?.name}
				disabled={workspaces.length <= 1}
				href="/workspaces"
				icon={Building2}
				label="Active workspace"
			/>

			<View className="h-px bg-border mx-5 my-4" />

			<Pressable
				className="flex-row items-center px-5 py-3 gap-4 active:bg-muted"
				onPress={signOut}
			>
				<Icon icon={LogOut} className="w-5 h-5 text-red-500" />
				<Text className="flex-1 text-[17px] text-red-500">Sign out</Text>
			</Pressable>
		</ScrollView>
	);
}

function SettingsRow({
	detail,
	disabled,
	href,
	icon,
	label,
}: {
	detail?: string;
	disabled?: boolean;
	href: string;
	icon: LucideIcon;
	label: string;
}) {
	const content = (
		<View
			className={cn(
				"flex-row items-center px-5 py-3 gap-4",
				disabled && "opacity-50",
			)}
		>
			<Icon icon={icon} className="w-5 h-5 text-foreground" />
			<Text className="flex-1 text-[17px] text-foreground">{label}</Text>
			{detail ? (
				<Text className="text-[15px] text-muted-foreground">{detail}</Text>
			) : null}
			<Icon icon={ChevronRight} className="w-3.5 h-3.5 text-muted-foreground" />
		</View>
	);

	if (disabled) {
		return content;
	}

	return (
		<Link href={href as never} asChild>
			<Pressable>{content}</Pressable>
		</Link>
	);
}
