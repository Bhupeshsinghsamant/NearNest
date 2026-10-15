import React, { useState } from "react";
import { StyleSheet, View, ScrollView, Alert, Image, TouchableOpacity } from "react-native";
import { Text, Surface, Button, Chip, Snackbar } from "react-native-paper";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  MapPin,
  User,
  CheckCircle2,
  Trash2,
  Edit3,
  MessageCircle,
  Camera,
  Video as VideoIcon,
  Navigation,
} from "lucide-react-native";
import { fetchListingById, deleteListing } from "../../src/api/listings";
import { getMediaUrl } from "../../src/api/client";
import { LoadingView } from "../../src/components/LoadingView";
import { ErrorView } from "../../src/components/ErrorView";
import { useAuth } from "../../src/context/AuthContext";

export default function RoomDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [snackMsg, setSnackMsg] = useState("");
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  const {
    data: room,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["listing", id],
    queryFn: () => fetchListingById(id!),
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteListing(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["listings", "room"] });
      router.back();
    },
    onError: (err: any) => {
      Alert.alert("Delete Failed", err.response?.data?.error || "Could not delete listing.");
    },
  });

  const isOwner = user && room && user.id === room.ownerId;

  const handleDelete = () => {
    Alert.alert(
      "Delete Room Listing",
      "Are you sure you want to delete this listing? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteMutation.mutate(),
        },
      ]
    );
  };

  const handleContact = () => {
    setSnackMsg(`Rental inquiry sent to ${room?.ownerName}. You'll be notified when they reply.`);
  };

  if (isLoading) return <LoadingView message="Loading room details..." />;
  if (isError || !room) {
    return (
      <ErrorView
        message={(error as any)?.message || "Room not found."}
        onRetry={() => refetch()}
      />
    );
  }

  const photos = room.photos || [];
  const videos = room.videos || [];
  const currentPhoto = photos[activePhotoIndex] || photos[0];
  const currentPhotoUrl = currentPhoto ? getMediaUrl(currentPhoto) : null;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Photo Gallery Hero */}
        {photos.length > 0 && currentPhotoUrl && (
          <Surface style={styles.galleryCard} elevation={1}>
            <View style={styles.heroContainer}>
              <Image
                source={{ uri: currentPhotoUrl }}
                style={styles.heroImage}
                resizeMode="cover"
              />
              <View style={styles.photoCountBadge}>
                <Camera size={13} color="#FFFFFF" />
                <Text style={styles.photoCountText}>
                  {activePhotoIndex + 1} / {photos.length}
                </Text>
              </View>
            </View>

            {photos.length > 1 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.thumbsScroll}
              >
                {photos.map((p, idx) => {
                  const pUrl = getMediaUrl(p);
                  const isActive = idx === activePhotoIndex;
                  return (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => setActivePhotoIndex(idx)}
                      style={[styles.thumbBtn, isActive && styles.activeThumbBtn]}
                    >
                      <Image source={{ uri: pUrl }} style={styles.thumbImage} />
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </Surface>
        )}

        {/* Main Info Card */}
        <Surface style={styles.card} elevation={1}>
          <View style={styles.priceHeader}>
            <View>
              <Text variant="headlineSmall" style={styles.price}>
                ₹{room.roomDetails?.rent?.toLocaleString("en-IN") || 0}
                <Text variant="titleMedium" style={styles.period}>
                  /{room.roomDetails?.period || "month"}
                </Text>
              </Text>
            </View>
            {room.roomDetails?.verified && (
              <View style={styles.verifiedChip}>
                <CheckCircle2 size={14} color="#059669" />
                <Text variant="labelSmall" style={styles.verifiedText}>
                  Verified Owner
                </Text>
              </View>
            )}
          </View>

          <Text variant="titleLarge" style={styles.title}>
            {room.title}
          </Text>

          <View style={styles.metaRow}>
            <MapPin size={16} color="#64748B" />
            <Text variant="bodyMedium" style={styles.metaText}>
              {room.locality}
            </Text>
          </View>
        </Surface>

        {/* Location & GPS Info */}
        {room.latitude !== undefined && room.latitude !== null && room.longitude !== undefined && room.longitude !== null && (
          <Surface style={styles.card} elevation={1}>
            <Text variant="titleMedium" style={styles.sectionHeading}>
              Geographic Location
            </Text>
            <View style={styles.geoInfoRow}>
              <Navigation size={18} color="#2563EB" />
              <View style={styles.geoTextContainer}>
                <Text style={styles.coordText}>
                  Latitude: {Number(room.latitude).toFixed(4)} · Longitude: {Number(room.longitude).toFixed(4)}
                </Text>
                <Text style={styles.geoSub}>
                  Calculated against OpenStreetMap geographic coordinates
                </Text>
              </View>
            </View>
          </Surface>
        )}

        {/* Video Walkthroughs */}
        {videos.length > 0 && (
          <Surface style={styles.card} elevation={1}>
            <Text variant="titleMedium" style={styles.sectionHeading}>
              Video Walkthroughs ({videos.length})
            </Text>
            {videos.map((vid, idx) => (
              <View key={idx} style={styles.videoCard}>
                <VideoIcon size={22} color="#7C3AED" />
                <View style={styles.videoInfo}>
                  <Text style={styles.videoTitle} numberOfLines={1}>
                    {vid.name || `Video Walkthrough ${idx + 1}`}
                  </Text>
                  {vid.size ? (
                    <Text style={styles.videoSize}>
                      {(vid.size / (1024 * 1024)).toFixed(1)} MB
                    </Text>
                  ) : null}
                </View>
              </View>
            ))}
          </Surface>
        )}

        {/* Amenities Section */}
        {room.roomDetails?.amenities && room.roomDetails.amenities.length > 0 && (
          <Surface style={styles.card} elevation={1}>
            <Text variant="titleMedium" style={styles.sectionHeading}>
              Amenities & Facilities
            </Text>
            <View style={styles.amenitiesGrid}>
              {room.roomDetails.amenities.map((amenity, idx) => (
                <Chip key={idx} style={styles.amenityChip} textStyle={styles.amenityText}>
                  {amenity}
                </Chip>
              ))}
            </View>
          </Surface>
        )}

        {/* Description Section */}
        <Surface style={styles.card} elevation={1}>
          <Text variant="titleMedium" style={styles.sectionHeading}>
            Room Description
          </Text>
          <Text variant="bodyMedium" style={styles.desc}>
            {room.description || "No additional description provided by the owner."}
          </Text>
        </Surface>

        {/* Owner Card */}
        <Surface style={styles.card} elevation={1}>
          <Text variant="titleMedium" style={styles.sectionHeading}>
            Owner Information
          </Text>
          <View style={styles.ownerRow}>
            <View style={styles.ownerAvatar}>
              <User size={24} color="#2563EB" />
            </View>
            <View>
              <Text variant="titleSmall" style={styles.ownerName}>
                {room.ownerName}
              </Text>
              <Text variant="bodySmall" style={styles.ownerSub}>
                Listing Owner · NearNest Member
              </Text>
            </View>
          </View>
        </Surface>

        {/* Owner Controls (If Authenticated User is the Owner) */}
        {isOwner ? (
          <Surface style={styles.ownerControlsCard} elevation={1}>
            <Text variant="titleSmall" style={styles.ownerControlsTitle}>
              Listing Management (Owner)
            </Text>
            <View style={styles.actionRow}>
              <Button
                mode="outlined"
                icon={() => <Edit3 size={16} color="#2563EB" />}
                onPress={() => router.push(`/rooms/create?id=${room.id}`)}
                style={styles.editBtn}
                textColor="#2563EB"
              >
                Edit
              </Button>
              <Button
                mode="contained"
                icon={() => <Trash2 size={16} color="#FFFFFF" />}
                onPress={handleDelete}
                loading={deleteMutation.isPending}
                style={styles.deleteBtn}
                buttonColor="#DC2626"
              >
                Delete
              </Button>
            </View>
          </Surface>
        ) : (
          /* Customer Enquiry Button */
          <Button
            mode="contained"
            icon={() => <MessageCircle size={18} color="#FFFFFF" />}
            onPress={handleContact}
            style={styles.contactBtn}
            buttonColor="#2563EB"
          >
            Contact Owner / Send Request
          </Button>
        )}
      </ScrollView>

      <Snackbar
        visible={!!snackMsg}
        onDismiss={() => setSnackMsg("")}
        duration={3500}
      >
        {snackMsg}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },
  galleryCard: {
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    marginBottom: 14,
  },
  heroContainer: {
    position: "relative",
    width: "100%",
    height: 240,
    backgroundColor: "#E2E8F0",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  photoCountBadge: {
    position: "absolute",
    bottom: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 6,
  },
  photoCountText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  thumbsScroll: {
    padding: 10,
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
  },
  thumbBtn: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 8,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "transparent",
  },
  activeThumbBtn: {
    borderColor: "#2563EB",
  },
  thumbImage: {
    width: "100%",
    height: "100%",
  },
  card: {
    padding: 18,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    marginBottom: 14,
  },
  priceHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  price: {
    fontWeight: "900",
    color: "#2563EB",
  },
  period: {
    color: "#64748B",
    fontWeight: "400",
  },
  verifiedChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  verifiedText: {
    color: "#059669",
    fontWeight: "700",
    marginLeft: 4,
  },
  title: {
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  metaText: {
    color: "#64748B",
    marginLeft: 6,
  },
  sectionHeading: {
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 12,
  },
  geoInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#F1F5F9",
    padding: 12,
    borderRadius: 10,
  },
  geoTextContainer: {
    flex: 1,
  },
  coordText: {
    fontWeight: "700",
    color: "#0F172A",
    fontSize: 13,
  },
  geoSub: {
    color: "#64748B",
    fontSize: 11,
    marginTop: 2,
  },
  videoCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FAF5FF",
    borderColor: "#E9D5FF",
    borderWidth: 1,
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    gap: 12,
  },
  videoInfo: {
    flex: 1,
  },
  videoTitle: {
    fontWeight: "700",
    color: "#581C87",
    fontSize: 13,
  },
  videoSize: {
    color: "#7E22CE",
    fontSize: 11,
    marginTop: 2,
  },
  amenitiesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  amenityChip: {
    backgroundColor: "#F1F5F9",
  },
  amenityText: {
    color: "#334155",
    fontSize: 12,
  },
  desc: {
    color: "#334155",
    lineHeight: 22,
  },
  ownerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  ownerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  ownerName: {
    fontWeight: "700",
    color: "#0F172A",
  },
  ownerSub: {
    color: "#64748B",
  },
  ownerControlsCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderWidth: 1,
  },
  ownerControlsTitle: {
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
  },
  editBtn: {
    flex: 1,
    borderRadius: 8,
    borderColor: "#2563EB",
  },
  deleteBtn: {
    flex: 1,
    borderRadius: 8,
  },
  contactBtn: {
    marginTop: 8,
    borderRadius: 12,
    paddingVertical: 6,
  },
});
