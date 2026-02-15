import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Linking,
  Alert,
  Platform,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../../hooks/useTheme';
import { useAboutContent } from '../../../hooks/useAboutContent';
import { aboutApi } from '../../../api/about';
import Card from '../../../components/ui/Card';
import Divider from '../../../components/ui/Divider';

// ---------------------------------------------------------------------------
// Cross-platform confirm dialog (Alert.alert can be buggy on web)
// ---------------------------------------------------------------------------
function confirmAction(title, message, onConfirm) {
  if (Platform.OS === 'web') {
    // eslint-disable-next-line no-restricted-globals
    if (confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }
  } else {
    Alert.alert(title, message, [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Entfernen', style: 'destructive', onPress: onConfirm },
    ]);
  }
}

// ---------------------------------------------------------------------------
// Team member photos (local assets)
// ---------------------------------------------------------------------------
const TEAM_IMAGES = {
  'clemens-poelker-junior': require('../../../../assets/team/clemens-poelker-junior.jpg'),
  'andrea-poelker': require('../../../../assets/team/andrea-poelker.jpg'),
  'eva-mueller': require('../../../../assets/team/eva-mueller.jpg'),
  'placeholder-female': require('../../../../assets/team/placeholder-female.jpg'),
  'placeholder-male': require('../../../../assets/team/placeholder-male.jpg'),
  'dominik-schmelzer': require('../../../../assets/team/dominik-schmelzer.jpg'),
  'martin-horstmann': require('../../../../assets/team/martin-horstmann.jpg'),
  'klaus-schulte': require('../../../../assets/team/klaus-schulte.jpg'),
  'rita-koerte': require('../../../../assets/team/rita-koerte.jpg'),
  'florian-werner': require('../../../../assets/team/florian-werner.jpg'),
  'thomas-thoben': require('../../../../assets/team/thomas-thoben.jpg'),
  'tim-bieker': require('../../../../assets/team/tim-bieker.jpg'),
  'jan-schultka': require('../../../../assets/team/jan-schultka.jpg'),
  'michael-heikens': require('../../../../assets/team/michael-heikens.jpg'),
  'rainer-quappe': require('../../../../assets/team/rainer-quappe.jpg'),
  'marcel-baumann': require('../../../../assets/team/marcel-baumann.jpg'),
  'hauke-siedentopp': require('../../../../assets/team/hauke-siedentopp.jpg'),
  'martin-middendorf': require('../../../../assets/team/martin-middendorf.jpg'),
  'andreas-maul': require('../../../../assets/team/andreas-maul.jpg'),
  'patrick-bonn': require('../../../../assets/team/patrick-bonn.jpg'),
  'fabian-benker': require('../../../../assets/team/fabian-benker.jpg'),
  'max-breiting': require('../../../../assets/team/max-breiting.jpg'),
  'mirco-tammen': require('../../../../assets/team/mirco-tammen.jpg'),
  'jan-lakeberg': require('../../../../assets/team/jan-lakeberg.jpg'),
  'leon-hackmann': require('../../../../assets/team/leon-hackmann.jpg'),
  'alexander-kampen': require('../../../../assets/team/alexander-kampen.jpg'),
  'thomas-janssen': require('../../../../assets/team/thomas-janssen.jpg'),
  'stephan-dykhoff': require('../../../../assets/team/stephan-dykhoff.jpg'),
  'waldemar-wolf': require('../../../../assets/team/waldemar-wolf.jpg'),
  'hauke-heyen': require('../../../../assets/team/hauke-heyen.jpg'),
};

// ---------------------------------------------------------------------------
// Department colours & icons
// ---------------------------------------------------------------------------
const DEPARTMENT_COLORS = {
  'Geschaeftsfuehrung': '#1565C0',
  'Buchhaltung': '#6A1B9A',
  'Service / Reparatur': '#E65100',
  'Verkauf E-Bikes': '#2E7D32',
  'Verkauf Motorgeraete / Kaercher': '#C62828',
  'Werkstatt Zweirad': '#00838F',
  'Werkstatt Motorgeraete': '#4E342E',
  'Maehroboter': '#558B2F',
  'Kaercher': '#F57C00',
  'Hausmeister': '#546E7A',
};

const DEPARTMENT_ICONS = {
  'Geschaeftsfuehrung': 'account-tie',
  'Buchhaltung': 'calculator-variant',
  'Service / Reparatur': 'headset',
  'Verkauf E-Bikes': 'bicycle',
  'Verkauf Motorgeraete / Kaercher': 'engine',
  'Werkstatt Zweirad': 'wrench',
  'Werkstatt Motorgeraete': 'tools',
  'Maehroboter': 'robot-mower',
  'Kaercher': 'spray-bottle',
  'Hausmeister': 'home-city',
};

// ---------------------------------------------------------------------------
// Default team data (fallback when no DB content)
// ---------------------------------------------------------------------------
const TEAM_DATA = [
  {
    department: 'Geschaeftsfuehrung',
    label: 'Gesch\u00e4ftsf\u00fchrung',
    members: [
      { name: 'Clemens Poelker Junior', position: 'Gesch\u00e4ftsf\u00fchrer', phone: '04952/82673843', image: 'clemens-poelker-junior' },
    ],
  },
  {
    department: 'Buchhaltung',
    label: 'Buchhaltung',
    members: [
      { name: 'Andrea Poelker', position: 'Buchhaltung', phone: null, image: 'andrea-poelker' },
      { name: 'Eva M\u00fcller', position: 'Buchhaltung', phone: null, image: 'eva-mueller' },
      { name: 'Carina Horstmann', position: 'Buchhaltung | Garantie', phone: null, image: 'placeholder-female' },
      { name: 'Nils Poelker', position: 'Buchhaltung', phone: null, image: 'placeholder-male' },
    ],
  },
  {
    department: 'Service / Reparatur',
    label: 'Service / Reparatur',
    members: [
      { name: 'Dominik Schmelzer', position: 'Reparatur- und Serviceannahme', phone: '04952/82673845', image: 'dominik-schmelzer' },
      { name: 'Martin Horstmann', position: 'Ersatzteilservice', phone: '04952/82673840', image: 'martin-horstmann' },
      { name: 'Klaus Schulte', position: 'Kundendienst', phone: null, image: 'klaus-schulte' },
      { name: 'Rita K\u00f6rte', position: 'Die gute Seele des Betriebes', phone: null, image: 'rita-koerte' },
      { name: 'Theda Schmidt', position: 'Die gute Seele des Betriebes', phone: null, image: 'placeholder-female' },
    ],
  },
  {
    department: 'Verkauf E-Bikes',
    label: 'Verkauf E-Bikes',
    members: [
      { name: 'Florian Werner', position: 'Verkauf - Experte E-Bikes', phone: '04952/82673852', image: 'florian-werner' },
      { name: 'Thomas Thoben', position: 'Verkauf - Experte E-Bikes u. Motorger\u00e4te', phone: '04952/82673854', image: 'thomas-thoben' },
      { name: 'Tim Bieker', position: 'Verkauf - Experte E-Bikes', phone: '04952/82673863', image: 'tim-bieker' },
      { name: 'Yannick M\u00f6hlmann', position: 'Verkauf - Experte E-Bikes', phone: '04952/82673858', image: 'placeholder-male' },
      { name: 'Frederic Malzahn', position: 'Verkauf - Experte E-Bikes', phone: null, image: 'placeholder-male' },
    ],
  },
  {
    department: 'Verkauf Motorgeraete / Kaercher',
    label: 'Verkauf Motorger\u00e4te / K\u00e4rcher',
    members: [
      { name: 'Jan Schultka', position: 'Verkauf - Experte K\u00e4rcher', phone: '04952/82673848', image: 'jan-schultka' },
      { name: 'Michael Heikens', position: 'Verkauf - Experte Motorger\u00e4te', phone: '04952/82673857', image: 'michael-heikens' },
    ],
  },
  {
    department: 'Werkstatt Zweirad',
    label: 'Werkstatt Zweirad',
    members: [
      { name: 'Patrick Bonn', position: 'Zweiradmechatroniker - Serviceannahme', phone: null, image: 'patrick-bonn' },
      { name: 'Fabian Benker', position: 'Zweiradmechatroniker', phone: null, image: 'fabian-benker' },
      { name: 'Max Breiting', position: 'Zweiradmechatroniker', phone: null, image: 'max-breiting' },
      { name: 'Mirco Tammen', position: 'Zweiradmechatroniker', phone: null, image: 'mirco-tammen' },
      { name: 'Jan Lakeberg', position: 'Zweiradmechatroniker', phone: null, image: 'jan-lakeberg' },
      { name: 'Manuela Scherzer-Brosch', position: 'Zweiradmechanikermeisterin', phone: null, image: 'placeholder-female' },
      { name: 'Ivan Yusyumbeli', position: 'Zweiradmechatroniker', phone: null, image: 'placeholder-male' },
      { name: 'Sven Onken', position: 'Zweiradmechatroniker', phone: null, image: 'placeholder-male' },
      { name: 'Daniel Meister', position: 'Zweiradmechatroniker', phone: null, image: 'placeholder-male' },
      { name: 'Dominik Przybilski', position: 'Zweiradmechatroniker', phone: null, image: 'placeholder-male' },
      { name: 'S\u00f6nke Haskamp', position: 'Auszubildender Zweiradmechatroniker', phone: null, image: 'placeholder-male' },
    ],
  },
  {
    department: 'Werkstatt Motorgeraete',
    label: 'Werkstatt Motorger\u00e4te',
    members: [
      { name: 'Hauke Siedentopp', position: 'Werkstattleitung Motorger\u00e4te', phone: '04952/82673847', image: 'hauke-siedentopp' },
      { name: 'Andreas Rohlmann', position: 'Mechaniker Motorger\u00e4te', phone: null, image: 'placeholder-male' },
      { name: 'Martin Middendorf', position: 'Mechaniker Motorger\u00e4te', phone: null, image: 'martin-middendorf' },
      { name: 'Patrick Rotman', position: 'Mechaniker Motorger\u00e4te', phone: null, image: 'placeholder-male' },
    ],
  },
  {
    department: 'Maehroboter',
    label: 'M\u00e4hroboter',
    members: [
      { name: 'Rainer Quappe', position: 'Experte - M\u00e4hroboter', phone: '04952/82673844', image: 'rainer-quappe' },
      { name: 'Marcel Baumann', position: 'Experte - M\u00e4hroboter', phone: null, image: 'marcel-baumann' },
    ],
  },
  {
    department: 'Kaercher',
    label: 'K\u00e4rcher',
    members: [
      { name: 'Alexander Kampen', position: 'K\u00e4rcher Werkstattleitung', phone: '04952/82673846', image: 'alexander-kampen' },
      { name: 'Thomas Janssen', position: 'K\u00e4rcher Monteur Au\u00dfendienst', phone: '04952/82673846', image: 'thomas-janssen' },
    ],
  },
  {
    department: 'Hausmeister',
    label: 'Hausmeister',
    members: [
      { name: 'Stephan Dykhoff', position: 'Hausmeister', phone: null, image: 'stephan-dykhoff' },
      { name: 'Waldemar Wolf', position: 'Hausmeister', phone: null, image: 'waldemar-wolf' },
      { name: 'Hauke Heyen', position: 'Hausmeister', phone: null, image: 'hauke-heyen' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Resolve member photo source
// ---------------------------------------------------------------------------
function getMemberImageSource(member) {
  // Uploaded image takes priority
  if (member.imageUrl) {
    return { uri: aboutApi.getImageUrl(member.imageUrl) };
  }
  // Local asset by key
  if (member.image && TEAM_IMAGES[member.image]) {
    return TEAM_IMAGES[member.image];
  }
  // Fallback placeholder
  return TEAM_IMAGES['placeholder-male'];
}

// ---------------------------------------------------------------------------
// Member card (view + edit mode)
// ---------------------------------------------------------------------------
function MemberCard({
  member,
  memberIndex,
  totalMembers,
  theme,
  isWide,
  isEditMode,
  onUpdate,
  onDelete,
  onPickImage,
  onMove,
}) {
  const s = memberStyles(theme, isWide);

  const handlePhonePress = useCallback(() => {
    if (member.phone) {
      const cleaned = member.phone.replace(/[^0-9+]/g, '');
      Linking.openURL(`tel:${cleaned}`);
    }
  }, [member.phone]);

  const imageSource = getMemberImageSource(member);

  // --- Edit mode ---
  if (isEditMode) {
    return (
      <View style={s.editCard}>
        {/* Top row: Photo + Name/Position fields */}
        <View style={s.editTopRow}>
          {/* Tappable photo */}
          <TouchableOpacity onPress={onPickImage} activeOpacity={0.7}>
            <View style={{ position: 'relative' }}>
              <Image source={imageSource} style={s.editPhoto} resizeMode="cover" />
              <View style={s.editPhotoOverlay}>
                <MaterialCommunityIcons name="camera" size={20} color="#FFFFFF" />
              </View>
            </View>
          </TouchableOpacity>

          <View style={s.editFields}>
            {/* Editable name */}
            <TextInput
              style={[
                theme.typography.styles.body,
                s.editInput,
                {
                  fontWeight: theme.typography.weights.semiBold,
                  color: theme.colors.text,
                  backgroundColor: theme.colors.surfaceVariant,
                  borderColor: theme.colors.border,
                },
              ]}
              value={member.name}
              onChangeText={(text) => onUpdate({ ...member, name: text })}
              placeholder="Name"
              placeholderTextColor={theme.colors.textTertiary}
            />
            {/* Editable position */}
            <TextInput
              style={[
                theme.typography.styles.body,
                s.editInput,
                {
                  color: theme.colors.textSecondary,
                  backgroundColor: theme.colors.surfaceVariant,
                  borderColor: theme.colors.border,
                },
              ]}
              value={member.position}
              onChangeText={(text) => onUpdate({ ...member, position: text })}
              placeholder="Position"
              placeholderTextColor={theme.colors.textTertiary}
            />
            {/* Editable phone */}
            <TextInput
              style={[
                theme.typography.styles.body,
                s.editInput,
                {
                  color: theme.colors.primary,
                  backgroundColor: theme.colors.surfaceVariant,
                  borderColor: theme.colors.border,
                },
              ]}
              value={member.phone || ''}
              onChangeText={(text) => onUpdate({ ...member, phone: text || null })}
              placeholder="Telefon hinzufügen"
              placeholderTextColor={theme.colors.textTertiary}
              keyboardType="phone-pad"
            />
          </View>
        </View>

        {/* Reorder + Delete row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: theme.spacing.sm, gap: 6 }}>
          {/* Move up */}
          <TouchableOpacity
            onPress={() => onMove(-1)}
            disabled={memberIndex === 0}
            activeOpacity={0.7}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: theme.colors.surfaceVariant,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: memberIndex === 0 ? 0.3 : 1,
            }}
          >
            <MaterialCommunityIcons name="chevron-up" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          {/* Move down */}
          <TouchableOpacity
            onPress={() => onMove(1)}
            disabled={memberIndex === totalMembers - 1}
            activeOpacity={0.7}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: theme.colors.surfaceVariant,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: memberIndex === totalMembers - 1 ? 0.3 : 1,
            }}
          >
            <MaterialCommunityIcons name="chevron-down" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          {/* Spacer */}
          <View style={{ flex: 1 }} />

          {/* Delete button */}
          <TouchableOpacity
            onPress={onDelete}
            activeOpacity={0.7}
            style={s.editDeleteButton}
          >
            <MaterialCommunityIcons name="trash-can-outline" size={18} color={theme.colors.error} />
            <Text style={[theme.typography.styles.bodySmall, { color: theme.colors.error, marginLeft: 6, fontWeight: theme.typography.weights.medium }]}>
              Entfernen
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // --- View mode ---
  return (
    <View style={s.container}>
      <Image source={imageSource} style={s.photo} resizeMode="cover" />
      <View style={s.info}>
        <Text
          style={[
            theme.typography.styles.bodySmall,
            {
              fontWeight: theme.typography.weights.semiBold,
              color: theme.colors.text,
            },
          ]}
          numberOfLines={1}
        >
          {member.name}
        </Text>
        <Text
          style={[
            theme.typography.styles.caption,
            { color: theme.colors.textSecondary, marginTop: 1 },
          ]}
          numberOfLines={2}
        >
          {member.position}
        </Text>
        {member.phone && (
          <TouchableOpacity onPress={handlePhonePress} hitSlop={theme.hitSlop}>
            <View style={s.phoneRow}>
              <MaterialCommunityIcons
                name="phone"
                size={12}
                color={theme.colors.primary}
              />
              <Text
                style={[
                  theme.typography.styles.caption,
                  { color: theme.colors.primary, marginLeft: 4 },
                ]}
              >
                {member.phone}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const memberStyles = (theme, isWide) =>
  StyleSheet.create({
    // --- View mode ---
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      width: isWide ? '48%' : '100%',
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.xs,
    },
    photo: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: theme.colors.surfaceVariant,
    },
    info: {
      flex: 1,
      marginLeft: theme.spacing.sm,
    },
    phoneRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 3,
    },
    // --- Edit mode ---
    editCard: {
      width: '100%',
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.primary + '30',
    },
    editTopRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    editPhoto: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: theme.colors.skeleton,
    },
    editPhotoOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: 'rgba(0,0,0,0.35)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    editFields: {
      flex: 1,
      marginLeft: theme.spacing.md,
      gap: 6,
    },
    editInput: {
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
      minHeight: 42,
    },
    editDeleteButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.error + '40',
      backgroundColor: theme.colors.error + '10',
    },
  });

// ---------------------------------------------------------------------------
// Department section (collapsible, with edit mode)
// ---------------------------------------------------------------------------
function DepartmentSection({
  dept,
  deptIndex,
  totalDepts,
  theme,
  isWide,
  isEditMode,
  onUpdateDept,
  onDeleteDept,
  onAddMember,
  onMoveDept,
  uploadImage,
}) {
  const [expanded, setExpanded] = useState(true);

  const color = DEPARTMENT_COLORS[dept.department] || theme.colors.primary;
  const icon = DEPARTMENT_ICONS[dept.department] || 'account-group';

  const s = departmentStyles(theme, color);

  // Update a single member in this department
  const handleUpdateMember = useCallback(
    (memberIndex, updatedMember) => {
      const newMembers = [...dept.members];
      newMembers[memberIndex] = updatedMember;
      onUpdateDept({ ...dept, members: newMembers });
    },
    [dept, onUpdateDept]
  );

  // Move a member within this department
  const handleMoveMember = useCallback(
    (memberIndex, direction) => {
      const targetIndex = memberIndex + direction;
      if (targetIndex < 0 || targetIndex >= dept.members.length) return;
      const newMembers = [...dept.members];
      const temp = newMembers[memberIndex];
      newMembers[memberIndex] = newMembers[targetIndex];
      newMembers[targetIndex] = temp;
      onUpdateDept({ ...dept, members: newMembers });
    },
    [dept, onUpdateDept]
  );

  // Delete a single member from this department
  const handleDeleteMember = useCallback(
    (memberIndex) => {
      const memberName = dept.members[memberIndex]?.name || 'diesen Mitarbeiter';
      confirmAction(
        'Mitarbeiter entfernen',
        `"${memberName}" wirklich entfernen?`,
        () => {
          const newMembers = dept.members.filter((_, i) => i !== memberIndex);
          onUpdateDept({ ...dept, members: newMembers });
        }
      );
    },
    [dept, onUpdateDept]
  );

  // Pick image for a specific member
  const handlePickImage = useCallback(
    async (memberIndex) => {
      try {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });

        if (!result.canceled && result.assets?.[0]) {
          const uploadedUrl = await uploadImage(result.assets[0].uri);
          if (uploadedUrl) {
            const updatedMember = {
              ...dept.members[memberIndex],
              imageUrl: uploadedUrl,
              image: undefined, // clear local asset key
            };
            handleUpdateMember(memberIndex, updatedMember);
          }
        }
      } catch (error) {
        console.warn('Image picker error:', error);
      }
    },
    [dept, handleUpdateMember, uploadImage]
  );

  // Update department label
  const handleLabelChange = useCallback(
    (text) => {
      onUpdateDept({ ...dept, label: text });
    },
    [dept, onUpdateDept]
  );

  return (
    <Card style={s.card}>
      <TouchableOpacity
        onPress={() => setExpanded((prev) => !prev)}
        activeOpacity={0.7}
        style={s.header}
      >
        <View style={s.iconCircle}>
          <MaterialCommunityIcons name={icon} size={18} color="#FFFFFF" />
        </View>

        <View style={s.headerText}>
          {isEditMode ? (
            <TextInput
              style={[
                theme.typography.styles.bodySmall,
                {
                  fontWeight: theme.typography.weights.bold,
                  color: theme.colors.text,
                  backgroundColor: theme.colors.surfaceVariant,
                  borderRadius: theme.borderRadius.md,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  paddingHorizontal: theme.spacing.sm,
                  paddingVertical: theme.spacing.xs,
                  minHeight: 38,
                  flex: 1,
                },
              ]}
              value={dept.label}
              onChangeText={handleLabelChange}
              placeholder="Abteilungsname"
              placeholderTextColor={theme.colors.textTertiary}
            />
          ) : (
            <Text
              style={[
                theme.typography.styles.bodySmall,
                {
                  fontWeight: theme.typography.weights.bold,
                  color: theme.colors.text,
                },
              ]}
              numberOfLines={1}
            >
              {dept.label}
            </Text>
          )}
          <Text
            style={[
              theme.typography.styles.caption,
              { color: theme.colors.textTertiary },
            ]}
          >
            {dept.members.length}{' '}
            {dept.members.length === 1 ? 'Mitarbeiter' : 'Mitarbeiter'}
          </Text>
        </View>

        {isEditMode && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            {/* Reorder department arrows */}
            <TouchableOpacity
              onPress={() => onMoveDept(-1)}
              disabled={deptIndex === 0}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              style={{
                width: 30,
                height: 30,
                borderRadius: 15,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: deptIndex === 0 ? 0.3 : 1,
              }}
            >
              <MaterialCommunityIcons
                name="chevron-up"
                size={20}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onMoveDept(1)}
              disabled={deptIndex === totalDepts - 1}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              style={{
                width: 30,
                height: 30,
                borderRadius: 15,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: deptIndex === totalDepts - 1 ? 0.3 : 1,
              }}
            >
              <MaterialCommunityIcons
                name="chevron-down"
                size={20}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>

            {/* Delete department */}
            <TouchableOpacity
              onPress={() => {
                confirmAction(
                  'Abteilung entfernen',
                  `"${dept.label}" und alle Mitarbeiter entfernen?`,
                  onDeleteDept
                );
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={{
                marginLeft: 2,
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: theme.colors.error + '15',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MaterialCommunityIcons
                name="trash-can-outline"
                size={20}
                color={theme.colors.error}
              />
            </TouchableOpacity>
          </View>
        )}

        <MaterialCommunityIcons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={22}
          color={theme.colors.textTertiary}
        />
      </TouchableOpacity>

      {expanded && (
        <>
          <Divider style={{ marginVertical: theme.spacing.xs }} />
          <View style={s.membersWrap}>
            {dept.members.map((member, idx) => (
              <MemberCard
                key={`${dept.department}-${idx}`}
                member={member}
                memberIndex={idx}
                totalMembers={dept.members.length}
                theme={theme}
                isWide={isWide}
                isEditMode={isEditMode}
                onUpdate={(updated) => handleUpdateMember(idx, updated)}
                onDelete={() => handleDeleteMember(idx)}
                onPickImage={() => handlePickImage(idx)}
                onMove={(direction) => handleMoveMember(idx, direction)}
              />
            ))}

            {/* Add member button */}
            {isEditMode && (
              <TouchableOpacity
                onPress={onAddMember}
                activeOpacity={0.7}
                style={{
                  width: '100%',
                  marginTop: theme.spacing.xs,
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderStyle: 'dashed',
                    borderWidth: 1.5,
                    borderColor: theme.colors.primary + '60',
                    borderRadius: theme.borderRadius.lg,
                    paddingVertical: theme.spacing.md,
                    paddingHorizontal: theme.spacing.md,
                    backgroundColor: theme.colors.primaryLight + '30',
                    minHeight: 52,
                  }}
                >
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: theme.colors.primary,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <MaterialCommunityIcons
                      name="plus"
                      size={18}
                      color="#FFFFFF"
                    />
                  </View>
                  <Text
                    style={[
                      theme.typography.styles.body,
                      {
                        color: theme.colors.primary,
                        fontWeight: theme.typography.weights.semiBold,
                        marginLeft: theme.spacing.sm,
                      },
                    ]}
                  >
                    Mitarbeiter hinzufügen
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        </>
      )}
    </Card>
  );
}

const departmentStyles = (theme, color) =>
  StyleSheet.create({
    card: {
      marginBottom: theme.spacing.md,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    iconCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: color,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerText: {
      flex: 1,
      marginLeft: theme.spacing.sm,
    },
    membersWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
  });

// ---------------------------------------------------------------------------
// Main tab component
// ---------------------------------------------------------------------------
export default function TeamTab({ isEditMode, registerSave }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const { content, saving, updateContent, saveAllChanges, uploadImage } = useAboutContent('team');

  // Register save function for parent to call on "Fertig"
  useEffect(() => {
    if (registerSave) registerSave(saveAllChanges);
  }, [registerSave, saveAllChanges]);

  const isWide = width >= 500;
  const s = styles(theme);

  // Use DB departments if available, otherwise fall back to defaults
  const departments = useMemo(
    () => content.departments || TEAM_DATA,
    [content.departments]
  );

  const totalMembers = useMemo(
    () => departments.reduce((sum, dept) => sum + dept.members.length, 0),
    [departments]
  );

  // --------------- Save helper ---------------
  const saveDepartments = useCallback(
    (updatedDepts) => {
      updateContent('departments', updatedDepts);
    },
    [updateContent]
  );

  // --------------- Department-level operations ---------------
  const handleUpdateDept = useCallback(
    (deptIndex, updatedDept) => {
      const updated = [...departments];
      updated[deptIndex] = updatedDept;
      saveDepartments(updated);
    },
    [departments, saveDepartments]
  );

  const handleDeleteDept = useCallback(
    (deptIndex) => {
      const updated = departments.filter((_, i) => i !== deptIndex);
      saveDepartments(updated);
    },
    [departments, saveDepartments]
  );

  const handleAddMember = useCallback(
    (deptIndex) => {
      const updated = [...departments];
      updated[deptIndex] = {
        ...updated[deptIndex],
        members: [
          ...updated[deptIndex].members,
          {
            name: 'Neuer Mitarbeiter',
            position: 'Position',
            phone: null,
            image: 'placeholder-male',
          },
        ],
      };
      saveDepartments(updated);
    },
    [departments, saveDepartments]
  );

  const handleMoveDept = useCallback(
    (deptIndex, direction) => {
      const targetIndex = deptIndex + direction;
      if (targetIndex < 0 || targetIndex >= departments.length) return;
      const updated = [...departments];
      const temp = updated[deptIndex];
      updated[deptIndex] = updated[targetIndex];
      updated[targetIndex] = temp;
      saveDepartments(updated);
    },
    [departments, saveDepartments]
  );

  const handleAddDepartment = useCallback(() => {
    const newDept = {
      department: `Neue_Abteilung_${Date.now()}`,
      label: 'Neue Abteilung',
      members: [],
    };
    saveDepartments([...departments, newDept]);
  }, [departments, saveDepartments]);

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Saving indicator */}
      {saving && (
        <View style={s.savingBanner}>
          <ActivityIndicator size="small" color="#FFFFFF" />
          <Text style={s.savingText}>Speichern...</Text>
        </View>
      )}

      {/* Intro text */}
      <Card style={s.introCard}>
        <View style={s.introIconRow}>
          <MaterialCommunityIcons
            name="account-group"
            size={28}
            color={theme.colors.primary}
          />
        </View>
        <Text
          style={[
            theme.typography.styles.h5,
            {
              fontWeight: theme.typography.weights.bold,
              color: theme.colors.text,
              textAlign: 'center',
              marginTop: theme.spacing.sm,
            },
          ]}
        >
          {t('aboutUs.team.title', 'Unser Team')}
        </Text>
        <Text
          style={[
            theme.typography.styles.bodySmall,
            {
              color: theme.colors.textSecondary,
              textAlign: 'center',
              marginTop: theme.spacing.xs,
              lineHeight: 20,
            },
          ]}
        >
          {t(
            'aboutUs.team.intro',
            'Kompetente Beratung und erstklassiger Service - unser engagiertes Team steht Ihnen mit Fachwissen und Leidenschaft zur Seite.'
          )}
        </Text>

        {/* Total member badge */}
        <View style={s.badgeRow}>
          <View style={s.badge}>
            <MaterialCommunityIcons
              name="account-multiple"
              size={16}
              color="#FFFFFF"
            />
            <Text style={s.badgeText}>
              {totalMembers} {t('aboutUs.team.members', 'Mitarbeiter')}
            </Text>
          </View>
        </View>
      </Card>

      {/* Department sections */}
      {departments.map((dept, deptIndex) => (
        <DepartmentSection
          key={dept.department}
          dept={dept}
          deptIndex={deptIndex}
          totalDepts={departments.length}
          theme={theme}
          isWide={isWide}
          isEditMode={isEditMode}
          onUpdateDept={(updatedDept) => handleUpdateDept(deptIndex, updatedDept)}
          onDeleteDept={() => handleDeleteDept(deptIndex)}
          onAddMember={() => handleAddMember(deptIndex)}
          onMoveDept={(direction) => handleMoveDept(deptIndex, direction)}
          uploadImage={uploadImage}
        />
      ))}

      {/* Add department button */}
      {isEditMode && (
        <TouchableOpacity onPress={handleAddDepartment} activeOpacity={0.7}>
          <View
            style={{
              borderStyle: 'dashed',
              borderWidth: 2,
              borderColor: theme.colors.primary + '50',
              borderRadius: theme.borderRadius.lg,
              paddingVertical: theme.spacing.xl,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: theme.spacing.md,
              backgroundColor: theme.colors.primaryLight + '20',
              minHeight: 80,
            }}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: theme.colors.primary,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: theme.spacing.sm,
              }}
            >
              <MaterialCommunityIcons
                name="plus"
                size={26}
                color="#FFFFFF"
              />
            </View>
            <Text
              style={[
                theme.typography.styles.body,
                {
                  color: theme.colors.primary,
                  fontWeight: theme.typography.weights.semiBold,
                },
              ]}
            >
              Abteilung hinzufügen
            </Text>
          </View>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      padding: theme.spacing.md,
      paddingBottom: theme.spacing.xxl,
    },
    introCard: {
      marginBottom: theme.spacing.lg,
      alignItems: 'center',
    },
    introIconRow: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: theme.spacing.md,
    },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.primary,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs + 2,
      borderRadius: theme.borderRadius.round,
    },
    badgeText: {
      color: '#FFFFFF',
      fontSize: theme.typography.sizes.caption,
      fontWeight: theme.typography.weights.bold,
      fontFamily: theme.typography.fontFamily,
      marginLeft: 6,
    },
    savingBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primary,
      paddingVertical: theme.spacing.xs + 2,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      marginBottom: theme.spacing.sm,
    },
    savingText: {
      color: '#FFFFFF',
      fontSize: theme.typography.sizes.caption,
      fontWeight: theme.typography.weights.medium,
      fontFamily: theme.typography.fontFamily,
      marginLeft: 8,
    },
  });
