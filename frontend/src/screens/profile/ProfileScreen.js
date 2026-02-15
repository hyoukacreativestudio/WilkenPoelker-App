import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { useApi } from '../../hooks/useApi';
import { usersApi } from '../../api/users';
import Avatar from '../../components/ui/Avatar';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';
import SkeletonLoader from '../../components/shared/SkeletonLoader';
import { useToast } from '../../components/ui/Toast';

export default function ProfileScreen({ navigation }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { user, updateUser, logout } = useAuth();
  const { showToast } = useToast();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [street, setStreet] = useState('');
  const [zip, setZip] = useState('');
  const [city, setCity] = useState('');
  const [avatarSource, setAvatarSource] = useState(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [initialLoad, setInitialLoad] = useState(true);

  const profileApi = useApi(usersApi.getProfile);
  const updateProfileApi = useApi(usersApi.updateProfile);
  const uploadAvatarApi = useApi(usersApi.uploadAvatar);
  const changePasswordApi = useApi(usersApi.changePassword);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const result = await profileApi.execute();
      const profile = result?.data?.user || result?.data || result;
      if (profile) {
        setFirstName(profile.firstName || '');
        setLastName(profile.lastName || '');
        setUsername(profile.username || '');
        setEmail(profile.email || '');
        setPhone(profile.phone || '');
        setStreet(profile.address?.street || '');
        setZip(profile.address?.zip || '');
        setCity(profile.address?.city || '');
        setAvatarSource(profile.profilePicture || profile.avatar || profile.avatarUrl || null);
      }
    } catch (err) {
      // Use existing user data from auth context
      if (user) {
        setFirstName(user.firstName || '');
        setLastName(user.lastName || '');
        setUsername(user.username || '');
        setEmail(user.email || '');
        setPhone(user.phone || '');
        setStreet(user.address?.street || '');
        setZip(user.address?.zip || '');
        setCity(user.address?.city || '');
        setAvatarSource(user.profilePicture || user.avatar || user.avatarUrl || null);
      }
    } finally {
      setInitialLoad(false);
    }
  };

  const handleChangeAvatar = useCallback(async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        showToast({ type: 'error', message: t('errors.somethingWentWrong') });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        const formData = new FormData();

        if (Platform.OS === 'web') {
          // On web, fetch the blob from the data URI
          const response = await fetch(asset.uri);
          const blob = await response.blob();
          formData.append('avatar', blob, 'avatar.jpg');
        } else {
          formData.append('avatar', {
            uri: asset.uri,
            type: 'image/jpeg',
            name: 'avatar.jpg',
          });
        }

        try {
          const uploadResult = await uploadAvatarApi.execute(formData);
          const newAvatarUrl = uploadResult?.data?.profilePicture || uploadResult?.data?.avatarUrl || uploadResult?.profilePicture || asset.uri;
          setAvatarSource(newAvatarUrl);
          await updateUser({ profilePicture: newAvatarUrl });
          showToast({ type: 'success', message: t('profile.avatarUpdated') });
        } catch (err) {
          showToast({ type: 'error', message: t('errors.somethingWentWrong') });
        }
      }
    } catch (err) {
      showToast({ type: 'error', message: t('errors.somethingWentWrong') });
    }
  }, [t, uploadAvatarApi, updateUser, showToast]);

  const handleSaveProfile = useCallback(async () => {
    try {
      const profileData = {
        firstName,
        lastName,
        phone,
        address: {
          street,
          zip,
          city,
        },
      };

      const result = await updateProfileApi.execute(profileData);
      const updatedUser = result?.data?.user || result?.data || profileData;
      await updateUser(updatedUser);
      showToast({ type: 'success', message: t('profile.profileSaved') });
    } catch (err) {
      showToast({ type: 'error', message: t('errors.somethingWentWrong') });
    }
  }, [firstName, lastName, phone, street, zip, city, updateProfileApi, updateUser, t]);

  const handleChangePassword = useCallback(async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast({ type: 'error', message: t('errors.requiredField') });
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast({ type: 'error', message: t('errors.passwordMismatch') });
      return;
    }

    try {
      await changePasswordApi.execute({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast({ type: 'success', message: t('auth.passwordChanged') });
    } catch (err) {
      showToast({ type: 'error', message: t('errors.somethingWentWrong') });
    }
  }, [currentPassword, newPassword, confirmPassword, changePasswordApi, t, showToast]);

  const handleLogout = useCallback(() => {
    Alert.alert(
      t('auth.logout'),
      t('auth.logoutConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('auth.logout'),
          style: 'destructive',
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  }, [logout, t]);

  const fullName = `${firstName} ${lastName}`.trim();

  if (initialLoad) {
    return (
      <View style={s(theme).container}>
        <View style={{ alignItems: 'center', padding: theme.spacing.xl }}>
          <SkeletonLoader width={100} height={100} borderRadius={theme.borderRadius.round} style={{ marginBottom: theme.spacing.md }} />
          <SkeletonLoader width={160} height={18} borderRadius={theme.borderRadius.sm} style={{ marginBottom: theme.spacing.sm }} />
          <SkeletonLoader width={120} height={14} borderRadius={theme.borderRadius.sm} style={{ marginBottom: theme.spacing.lg }} />
        </View>
        <View style={{ padding: theme.spacing.md }}>
          {[1, 2, 3, 4].map((key) => (
            <SkeletonLoader key={key} width={'100%'} height={48} borderRadius={theme.borderRadius.md} style={{ marginBottom: theme.spacing.md }} />
          ))}
        </View>
      </View>
    );
  }

  const styles = s(theme);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={handleChangeAvatar} activeOpacity={0.7}>
            <View>
              <Avatar
                source={avatarSource}
                name={fullName}
                size={100}
              />
              {/* Camera overlay */}
              <View style={styles.cameraOverlay}>
                <MaterialCommunityIcons name="camera" size={18} color="#FFFFFF" />
              </View>
            </View>
          </TouchableOpacity>

          <Text style={styles.avatarName}>{fullName || t('profile.editProfile')}</Text>

          {/* Customer Number */}
          {user?.customerNumber ? (
            <Text style={styles.customerNumber}>
              {t('auth.customerNumber')}: {user.customerNumber}
            </Text>
          ) : null}
        </View>

        {/* Profile Fields */}
        <Card style={{ marginBottom: theme.spacing.lg }}>
          <Text style={styles.sectionTitle}>{t('profile.editProfile')}</Text>

          <Input
            label={t('profile.firstName')}
            value={firstName}
            onChangeText={setFirstName}
            placeholder={t('profile.firstName')}
            autoCapitalize="words"
          />

          <Input
            label={t('profile.lastName')}
            value={lastName}
            onChangeText={setLastName}
            placeholder={t('profile.lastName')}
            autoCapitalize="words"
          />

          <Input
            label={t('auth.username')}
            value={username}
            onChangeText={setUsername}
            placeholder={t('auth.username')}
            autoCapitalize="none"
          />

          <Input
            label={t('auth.email')}
            value={email}
            disabled
            placeholder={t('auth.email')}
            keyboardType="email-address"
          />

          <Input
            label={t('profile.phone')}
            value={phone}
            onChangeText={setPhone}
            placeholder={t('profile.phone')}
            keyboardType="phone-pad"
          />
        </Card>

        {/* Address Section */}
        <Card style={{ marginBottom: theme.spacing.lg }}>
          <Text style={styles.sectionTitle}>{t('profile.address')}</Text>

          <Input
            label={t('profile.street')}
            value={street}
            onChangeText={setStreet}
            placeholder={t('profile.street')}
          />

          <Input
            label={t('profile.zip')}
            value={zip}
            onChangeText={setZip}
            placeholder={t('profile.zip')}
            keyboardType="number-pad"
          />

          <Input
            label={t('profile.city')}
            value={city}
            onChangeText={setCity}
            placeholder={t('profile.city')}
          />
        </Card>

        {/* Save Button */}
        <Button
          title={t('common.save')}
          onPress={handleSaveProfile}
          variant="primary"
          fullWidth
          loading={updateProfileApi.loading}
          style={{ marginBottom: theme.spacing.xl }}
        />

        {/* Change Password Section */}
        <Card style={{ marginBottom: theme.spacing.lg }}>
          <Text style={styles.sectionTitle}>{t('profile.changePassword')}</Text>

          <Input
            label={t('auth.currentPassword')}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder={t('auth.currentPassword')}
            secureTextEntry
          />

          <Input
            label={t('auth.newPassword')}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder={t('auth.newPassword')}
            secureTextEntry
          />

          <Input
            label={t('auth.confirmPassword')}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder={t('auth.confirmPassword')}
            secureTextEntry
          />

          <Button
            title={t('profile.changePassword')}
            onPress={handleChangePassword}
            variant="secondary"
            fullWidth
            loading={changePasswordApi.loading}
          />
        </Card>

        {/* Logout Button */}
        <Button
          title={t('auth.logout')}
          onPress={handleLogout}
          variant="danger"
          fullWidth
          icon={
            <MaterialCommunityIcons
              name="logout"
              size={20}
              color="#FFFFFF"
            />
          }
          style={{ marginBottom: theme.spacing.xxl }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      padding: theme.spacing.md,
      paddingBottom: theme.spacing.xxl,
    },
    avatarSection: {
      alignItems: 'center',
      paddingVertical: theme.spacing.xl,
    },
    cameraOverlay: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: 32,
      height: 32,
      borderRadius: theme.borderRadius.round,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: theme.colors.background,
    },
    avatarName: {
      ...theme.typography.styles.h5,
      color: theme.colors.text,
      fontWeight: theme.typography.weights.bold,
      marginTop: theme.spacing.md,
    },
    customerNumber: {
      ...theme.typography.styles.caption,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.xs,
    },
    sectionTitle: {
      ...theme.typography.styles.h6,
      color: theme.colors.text,
      fontWeight: theme.typography.weights.bold,
      marginBottom: theme.spacing.md,
    },
  });
