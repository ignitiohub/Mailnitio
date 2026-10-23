"use client";

import { Badge, Banner, Button, Card, CardContent, CardHeader, CardTitle } from "@mailnitio/ui";
import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useMe } from "@/lib/me";

export default function SecuritySettingsPage() {
  const { me } = useMe();
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-1">
          <CardTitle>Two-factor authentication</CardTitle>
          <p className="text-body text-text-muted">
            Protect your account with a 6-digit code from an authenticator app each time you sign in.
          </p>
        </div>
        {me.user.twoFactorEnabled ? (
          <Badge tone="success">
            <ShieldCheck aria-hidden />
            On
          </Badge>
        ) : (
          <Badge tone="warning">Off</Badge>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {me.mfaRequiredForRole ? (
          <Banner tone="info" title="Required for your role">
            Two-factor authentication is required for workspace owners and admins and cannot be turned off.
          </Banner>
        ) : null}
        {me.user.twoFactorEnabled ? (
          <p className="text-body text-text-muted">
            Two-factor authentication is on for {me.user.email}. Keep your backup codes somewhere safe.
          </p>
        ) : (
          <Button asChild className="self-start">
            <Link href="/setup-2fa">Set up two-factor authentication</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
