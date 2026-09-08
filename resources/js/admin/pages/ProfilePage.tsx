import { FormEvent, useEffect, useState } from 'react';
import {
  DEFAULT_APP_CONTACT_SETTINGS,
  fetchAppContactSettings,
  updateAppContactSettings,
} from '../api/appContactService';
import { useToast } from '../feedback/ToastProvider';
import { updateAdminProfile } from '../api/authService';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { AccountIdentityHeader } from '../components/account/AccountIdentityHeader';
import { AccountPageHeader } from '../components/account/AccountPageHeader';
import { AccountSettingsLayout } from '../components/account/AccountSettingsLayout';
import { ContactSettingsSection } from '../components/account/ContactSettingsSection';
import { PersonalInformationSection } from '../components/account/PersonalInformationSection';
import { SecuritySettingsSection } from '../components/account/SecuritySettingsSection';
import { WhatsAppMessagesSection } from '../components/account/WhatsAppMessagesSection';
import type { AccountSettingsSection } from '../components/account/SettingsNavigation';
import {
  DEFAULT_WHATSAPP_TEMPLATES,
  fetchWhatsAppTemplates,
  updateWhatsAppTemplates,
} from '../api/whatsappTemplateService';

export function ProfilePage() {
  const { admin, isSuperAdmin, refreshAdmin } = useAuth();
  const toast = useToast();
  const [activeSection, setActiveSection] = useState<AccountSettingsSection>('personal');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState(DEFAULT_APP_CONTACT_SETTINGS.whatsapp_number);
  const [phoneNumber, setPhoneNumber] = useState(DEFAULT_APP_CONTACT_SETTINGS.phone_number);
  const [instagramUsername, setInstagramUsername] = useState(DEFAULT_APP_CONTACT_SETTINGS.instagram_username);
  const [contactError, setContactError] = useState<string | null>(null);
  const [contactLoading, setContactLoading] = useState(false);
  const [contactInitialLoading, setContactInitialLoading] = useState(true);
  const [activationMessage, setActivationMessage] = useState(DEFAULT_WHATSAPP_TEMPLATES.activation_message);
  const [renewalMessage, setRenewalMessage] = useState(DEFAULT_WHATSAPP_TEMPLATES.renewal_message);
  const [whatsappTemplatesError, setWhatsappTemplatesError] = useState<string | null>(null);
  const [whatsappTemplatesLoading, setWhatsappTemplatesLoading] = useState(false);
  const [whatsappTemplatesInitialLoading, setWhatsappTemplatesInitialLoading] = useState(true);

  const extractValidationError = (submitError: unknown, fallback: string) => {
    if (submitError instanceof ApiError && submitError.details && typeof submitError.details === 'object') {
      const details = submitError.details as { errors?: Record<string, string[]> };
      const validationMessages = details.errors
        ? Object.values(details.errors).flat().filter(Boolean)
        : [];

      if (validationMessages.length > 0) {
        return validationMessages.join(' ');
      }

      return submitError.message || fallback;
    }

    return submitError instanceof Error ? submitError.message : fallback;
  };

  useEffect(() => {
    setFullName(admin?.full_name || '');
    setEmail(admin?.email || '');
  }, [admin?.email, admin?.full_name]);

  useEffect(() => {
    let cancelled = false;

    const loadContactSettings = async () => {
      setContactInitialLoading(true);
      setContactError(null);

      try {
        const contact = await fetchAppContactSettings();
        if (!cancelled) {
          setWhatsappNumber(contact.whatsapp_number);
          setPhoneNumber(contact.phone_number);
          setInstagramUsername(contact.instagram_username);
        }
      } catch (loadError) {
        if (!cancelled) {
          setWhatsappNumber(DEFAULT_APP_CONTACT_SETTINGS.whatsapp_number);
          setPhoneNumber(DEFAULT_APP_CONTACT_SETTINGS.phone_number);
          setInstagramUsername(DEFAULT_APP_CONTACT_SETTINGS.instagram_username);
          setContactError(loadError instanceof Error ? loadError.message : 'تعذر تحميل معلومات التواصل.');
        }
      } finally {
        if (!cancelled) {
          setContactInitialLoading(false);
        }
      }
    };

    void loadContactSettings();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadWhatsAppTemplates = async () => {
      setWhatsappTemplatesInitialLoading(true);
      setWhatsappTemplatesError(null);

      try {
        const templates = await fetchWhatsAppTemplates();
        if (!cancelled) {
          setActivationMessage(templates.activation_message);
          setRenewalMessage(templates.renewal_message);
        }
      } catch (loadError) {
        if (!cancelled) {
          setActivationMessage(DEFAULT_WHATSAPP_TEMPLATES.activation_message);
          setRenewalMessage(DEFAULT_WHATSAPP_TEMPLATES.renewal_message);
          setWhatsappTemplatesError(
            loadError instanceof Error ? loadError.message : 'تعذر تحميل رسائل واتساب.',
          );
        }
      } finally {
        if (!cancelled) {
          setWhatsappTemplatesInitialLoading(false);
        }
      }
    };

    void loadWhatsAppTemplates();

    return () => {
      cancelled = true;
    };
  }, []);

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    setProfileError(null);
    setProfileLoading(true);

    try {
      await updateAdminProfile({
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
      });
      await refreshAdmin();
      toast.success('تم تحديث المعلومات الشخصية.');
    } catch (submitError) {
      setProfileError(submitError instanceof Error ? submitError.message : 'تعذر تحديث الملف الشخصي.');
    } finally {
      setProfileLoading(false);
    }
  };

  const savePassword = async (event: FormEvent) => {
    event.preventDefault();
    setPasswordError(null);

    if (!password) {
      setPasswordError('أدخل كلمة المرور الجديدة.');
      return;
    }

    if (password !== passwordConfirmation) {
      setPasswordError('تأكيد كلمة المرور غير متطابق.');
      return;
    }

    setPasswordLoading(true);

    try {
      await updateAdminProfile({
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        current_password: currentPassword || undefined,
        password,
        password_confirmation: passwordConfirmation,
      });
      await refreshAdmin();
      setCurrentPassword('');
      setPassword('');
      setPasswordConfirmation('');
      toast.success('تم تحديث كلمة المرور.');
    } catch (submitError) {
      setPasswordError(submitError instanceof Error ? submitError.message : 'تعذر تحديث كلمة المرور.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const saveContactSettings = async (event: FormEvent) => {
    event.preventDefault();
    setContactError(null);

    const payload = {
      whatsapp_number: whatsappNumber.trim(),
      phone_number: phoneNumber.trim(),
      instagram_username: instagramUsername.trim().replace(/^@+/, ''),
    };

    if (!payload.whatsapp_number || !payload.phone_number || !payload.instagram_username) {
      setContactError('يرجى تعبئة جميع حقول التواصل.');
      return;
    }

    setContactLoading(true);

    try {
      const contact = await updateAppContactSettings(payload);
      setWhatsappNumber(contact.whatsapp_number);
      setPhoneNumber(contact.phone_number);
      setInstagramUsername(contact.instagram_username);
      toast.success('تم تحديث معلومات التواصل.');
    } catch (submitError) {
      setContactError(extractValidationError(submitError, 'تعذر تحديث معلومات التواصل.'));
    } finally {
      setContactLoading(false);
    }
  };

  const saveWhatsAppTemplates = async (event: FormEvent) => {
    event.preventDefault();
    setWhatsappTemplatesError(null);

    const payload = {
      activation_message: activationMessage.trim(),
      renewal_message: renewalMessage.trim(),
    };

    if (!payload.activation_message || !payload.renewal_message) {
      setWhatsappTemplatesError('يرجى تعبئة جميع رسائل واتساب.');
      return;
    }

    setWhatsappTemplatesLoading(true);

    try {
      const templates = await updateWhatsAppTemplates(payload);
      setActivationMessage(templates.activation_message);
      setRenewalMessage(templates.renewal_message);
      toast.success('تم تحديث رسائل واتساب.');
    } catch (submitError) {
      setWhatsappTemplatesError(extractValidationError(submitError, 'تعذر تحديث رسائل واتساب.'));
    } finally {
      setWhatsappTemplatesLoading(false);
    }
  };

  const renderActiveSection = () => {
    if (activeSection === 'personal') {
      return (
        <PersonalInformationSection
          fullName={fullName}
          email={email}
          loading={profileLoading}
          error={profileError}
          onFullNameChange={setFullName}
          onEmailChange={setEmail}
          onSubmit={(event) => void saveProfile(event)}
        />
      );
    }

    if (activeSection === 'security') {
      return (
        <SecuritySettingsSection
          currentPassword={currentPassword}
          password={password}
          passwordConfirmation={passwordConfirmation}
          loading={passwordLoading}
          error={passwordError}
          onCurrentPasswordChange={setCurrentPassword}
          onPasswordChange={setPassword}
          onPasswordConfirmationChange={setPasswordConfirmation}
          onSubmit={(event) => void savePassword(event)}
        />
      );
    }

    if (activeSection === 'contact') {
      return (
        <ContactSettingsSection
          whatsappNumber={whatsappNumber}
          phoneNumber={phoneNumber}
          instagramUsername={instagramUsername}
          loading={contactLoading}
          initialLoading={contactInitialLoading}
          error={contactError}
          onWhatsappNumberChange={setWhatsappNumber}
          onPhoneNumberChange={setPhoneNumber}
          onInstagramUsernameChange={setInstagramUsername}
          onSubmit={(event) => void saveContactSettings(event)}
        />
      );
    }

    if (activeSection === 'whatsapp') {
      return (
        <WhatsAppMessagesSection
          activationMessage={activationMessage}
          renewalMessage={renewalMessage}
          loading={whatsappTemplatesLoading}
          initialLoading={whatsappTemplatesInitialLoading}
          error={whatsappTemplatesError}
          onActivationMessageChange={setActivationMessage}
          onRenewalMessageChange={setRenewalMessage}
          onSubmit={(event) => void saveWhatsAppTemplates(event)}
        />
      );
    }

    return null;
  };

  return (
    <div className="account-settings-page">
      <div className="account-settings-shell">
        <AccountPageHeader />
        <AccountIdentityHeader admin={admin} isSuperAdmin={isSuperAdmin} />

        <div className="account-settings-surface">
          <AccountSettingsLayout
            activeSection={activeSection}
            onSectionChange={setActiveSection}
          >
            {renderActiveSection()}
          </AccountSettingsLayout>
        </div>
      </div>
    </div>
  );
}
