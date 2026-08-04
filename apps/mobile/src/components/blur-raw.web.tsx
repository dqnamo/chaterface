import { StyleSheet, View } from "react-native";

export function BlurViewRawBackdrop({
	tint = "default",
	intensity = 50,
	...props
}) {
	return <View style={StyleSheet.absoluteFill} {...props} />;
}
