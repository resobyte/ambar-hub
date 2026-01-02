'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/common/ToastContext';
import { ConfirmModal } from '@/components/common';
import { apiPatch } from '@/lib/api';
import { AuthUser } from '@/types';

interface AccountFormProps {
  user: AuthUser;
}

export function AccountForm({ user }: AccountFormProps) {
  const router = useRouter();
  const toast = useToast();
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [email, setEmail] = useState(user.email);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPending, startTransition] = useTransition();
  const [profileConfirmOpen, setProfileConfirmOpen] = useState(false);
  const [passwordConfirmOpen, setPasswordConfirmOpen] = useState(false);

  const isProfileChanged = 
    firstName !== user.firstName || 
    lastName !== user.lastName || 
    email !== user.email;

  const isPasswordValid = 
    currentPassword.length > 0 && 
    newPassword.length >= 8 && 
    confirmPassword.length > 0 &&
    newPassword === confirmPassword;

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileConfirmOpen(true);
  };

  const handleProfileConfirm = async () => {
    startTransition(async () => {
      try {
        await apiPatch(`/users/${user.id}`, {
          firstName,
          lastName,
          email,
        });
        toast.success('Profile updated successfully');
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to update profile');
        throw error;
      }
    });
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setPasswordConfirmOpen(true);
  };

  const handlePasswordConfirm = async () => {
    startTransition(async () => {
      try {
        await apiPatch(`/users/${user.id}`, {
          password: newPassword,
        });
        toast.success('Password updated successfully');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to update password');
        throw error;
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-xl border border-border shadow-sm p-6">
        <h3 className="text-lg font-bold text-foreground mb-4">Profile Information</h3>
        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none bg-muted/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none bg-muted/20"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none bg-muted/20"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isPending || !isProfileChanged}
              className="px-4 py-2 text-sm font-bold text-white bg-primary hover:bg-primary-dark rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? (
                <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'Update Profile'
              )}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm p-6">
        <h3 className="text-lg font-bold text-foreground mb-4">Change Password</h3>
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none bg-muted/20"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none bg-muted/20"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none bg-muted/20"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isPending || !isPasswordValid}
              className="px-4 py-2 text-sm font-bold text-white bg-primary hover:bg-primary-dark rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? (
                <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'Update Password'
              )}
            </button>
          </div>
        </form>
      </div>

      <ConfirmModal
        isOpen={profileConfirmOpen}
        onClose={() => setProfileConfirmOpen(false)}
        onConfirm={handleProfileConfirm}
        title="Update Profile"
        message="Are you sure you want to update your profile information?"
        confirmText="Update"
        cancelText="Cancel"
      />

      <ConfirmModal
        isOpen={passwordConfirmOpen}
        onClose={() => setPasswordConfirmOpen(false)}
        onConfirm={handlePasswordConfirm}
        title="Change Password"
        message="Are you sure you want to change your password? You will need to use the new password on your next login."
        confirmText="Change Password"
        cancelText="Cancel"
      />
    </div>
  );
}
