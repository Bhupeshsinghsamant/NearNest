import React, { useState, useEffect } from "react";
import { StyleSheet, View, ScrollView, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { Text, TextInput, Button, Surface, Chip } from "react-native-paper";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createListing, fetchListingById, updateListing } from "../../src/api/listings";
import { useAuth } from "../../src/context/AuthContext";
import { LoadingView } from "../../src/components/LoadingView";

const AVAILABLE_AMENITIES = [
  "WiFi",
  "Water 24x7",
  "Attached Bath",
  "Furnished",
  "Mess nearby",
  "Balcony",
  "Parking",
  "CCTV",
  "Laundry",
];

export default function CreateRoomScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!id;
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [rent, setRent] = useState("");
  const [locality, setLocality] = useState(user?.area || "");
  const [description, setDescription] = useState("");
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(["WiFi", "Water 24x7"]);
  const [errorMsg, setErrorMsg] = useState("");

  const { data: existingRoom, isLoading: isLoadingExisting } = useQuery({
    queryKey: ["listing", id],
    queryFn: () => fetchListingById(id!),
    enabled: isEditing,
  });

  useEffect(() => {
    if (existingRoom) {
      setTitle(existingRoom.title);
      setRent(existingRoom.roomDetails?.rent?.toString() || "");
      setLocality(existingRoom.locality);
      setDescription(existingRoom.description || "");
      if (existingRoom.roomDetails?.amenities) {
        setSelectedAmenities(existingRoom.roomDetails.amenities);
      }
    }
  }, [existingRoom]);

  const mutation = useMutation({
    mutationFn: (payload: any) =>
      isEditing ? updateListing(id!, payload) : createListing(payload),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["listings", "room"] });
      queryClient.invalidateQueries({ queryKey: ["listing", saved.id] });
      Alert.alert(
        "Success",
        isEditing ? "Room listing updated successfully!" : "Room listed successfully!",
        [{ text: "OK", onPress: () => router.back() }]
      );
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error || err.message || "Failed to save room listing.";
      setErrorMsg(msg);
    },
  });

  const toggleAmenity = (amenity: string) => {
    if (selectedAmenities.includes(amenity)) {
      setSelectedAmenities(selectedAmenities.filter((a) => a !== amenity));
    } else {
      setSelectedAmenities([...selectedAmenities, amenity]);
    }
  };

  const handleSubmit = () => {
    if (!title.trim() || !rent.trim() || !locality.trim()) {
      setErrorMsg("Please fill in the title, rent, and locality.");
      return;
    }
    const rentNum = Number(rent);
    if (isNaN(rentNum) || rentNum <= 0) {
      setErrorMsg("Please enter a valid rental amount.");
      return;
    }
    setErrorMsg("");

    const payload = {
      type: "room",
      title: title.trim(),
      locality: locality.trim(),
      description: description.trim(),
      roomDetails: {
        rent: rentNum,
        period: "month",
        amenities: selectedAmenities,
        verified: isEditing ? existingRoom?.roomDetails?.verified : false,
      },
    };

    mutation.mutate(payload);
  };

  if (isEditing && isLoadingExisting) {
    return <LoadingView message="Loading listing data..." />;
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Surface style={styles.card} elevation={1}>
          <Text variant="headlineSmall" style={styles.formTitle}>
            {isEditing ? "Edit Room Listing" : "List a Room"}
          </Text>
          <Text variant="bodySmall" style={styles.formSubtitle}>
            Publish accommodation details for students and locals nearby
          </Text>

          {errorMsg ? (
            <View style={styles.errorBox}>
              <Text variant="bodySmall" style={styles.errorText}>
                {errorMsg}
              </Text>
            </View>
          ) : null}

          <TextInput
            label="Room Title *"
            value={title}
            onChangeText={(t) => {
              setTitle(t);
              setErrorMsg("");
            }}
            placeholder="e.g. Single room, attached bath, near library"
            mode="outlined"
            style={styles.input}
          />

          <TextInput
            label="Monthly Rent (₹) *"
            value={rent}
            onChangeText={(t) => {
              setRent(t);
              setErrorMsg("");
            }}
            keyboardType="numeric"
            placeholder="e.g. 5500"
            mode="outlined"
            style={styles.input}
          />

          <TextInput
            label="Locality / Address Area *"
            value={locality}
            onChangeText={(t) => {
              setLocality(t);
              setErrorMsg("");
            }}
            placeholder="e.g. Sector 4, North Gate"
            mode="outlined"
            style={styles.input}
          />

          <Text variant="titleSmall" style={styles.amenitiesHeading}>
            Select Amenities
          </Text>
          <View style={styles.chipsWrap}>
            {AVAILABLE_AMENITIES.map((amenity) => {
              const isSelected = selectedAmenities.includes(amenity);
              return (
                <Chip
                  key={amenity}
                  selected={isSelected}
                  onPress={() => toggleAmenity(amenity)}
                  style={[styles.chip, isSelected && styles.selectedChip]}
                  textStyle={isSelected ? styles.selectedChipText : styles.chipText}
                >
                  {amenity}
                </Chip>
              );
            })}
          </View>

          <TextInput
            label="Additional Details & Terms"
            value={description}
            onChangeText={setDescription}
            placeholder="Mention rules, mess options, electricity bills, etc."
            multiline
            numberOfLines={4}
            mode="outlined"
            style={[styles.input, styles.textArea]}
          />

          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={mutation.isPending}
            disabled={mutation.isPending}
            style={styles.submitBtn}
            buttonColor="#2563EB"
          >
            {isEditing ? "Update Room Listing" : "Publish Room"}
          </Button>
        </Surface>
      </ScrollView>
    </KeyboardAvoidingView>
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
  card: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
  },
  formTitle: {
    fontWeight: "800",
    color: "#0F172A",
  },
  formSubtitle: {
    color: "#64748B",
    marginTop: 2,
    marginBottom: 16,
  },
  errorBox: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
    borderWidth: 1,
    padding: 10,
    borderRadius: 8,
    marginBottom: 14,
  },
  errorText: {
    color: "#DC2626",
    fontWeight: "500",
  },
  input: {
    marginBottom: 14,
    backgroundColor: "#FFFFFF",
  },
  textArea: {
    height: 100,
  },
  amenitiesHeading: {
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 6,
    marginBottom: 8,
  },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    backgroundColor: "#F1F5F9",
  },
  selectedChip: {
    backgroundColor: "#DBEAFE",
  },
  chipText: {
    color: "#475569",
    fontSize: 12,
  },
  selectedChipText: {
    color: "#1E40AF",
    fontWeight: "700",
    fontSize: 12,
  },
  submitBtn: {
    borderRadius: 10,
    paddingVertical: 4,
    marginTop: 10,
  },
});
