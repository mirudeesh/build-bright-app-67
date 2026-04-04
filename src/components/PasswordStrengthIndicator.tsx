import { useMemo } from "react";
import { Progress } from "@/components/ui/progress";
import { Check, X } from "lucide-react";

interface PasswordStrengthIndicatorProps {
  password: string;
}

const PasswordStrengthIndicator = ({ password }: PasswordStrengthIndicatorProps) => {
  const checks = useMemo(() => [
    { label: "At least 6 characters", met: password.length >= 6 },
    { label: "Uppercase letter", met: /[A-Z]/.test(password) },
    { label: "Lowercase letter", met: /[a-z]/.test(password) },
    { label: "Number", met: /[0-9]/.test(password) },
    { label: "Special character", met: /[^A-Za-z0-9]/.test(password) },
  ], [password]);

  const score = checks.filter(c => c.met).length;
  const percent = (score / checks.length) * 100;

  const strength = score <= 2 ? "Weak" : score <= 3 ? "Fair" : score <= 4 ? "Good" : "Strong";
  const colorClass = score <= 2 ? "bg-destructive" : score <= 3 ? "bg-yellow-500" : score <= 4 ? "bg-blue-500" : "bg-green-500";

  if (!password) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Password strength</span>
        <span className={`font-medium ${score <= 2 ? "text-destructive" : score <= 3 ? "text-yellow-500" : score <= 4 ? "text-blue-500" : "text-green-500"}`}>
          {strength}
        </span>
      </div>
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div className={`h-full transition-all ${colorClass}`} style={{ width: `${percent}%` }} />
      </div>
      <ul className="space-y-1">
        {checks.map((check) => (
          <li key={check.label} className="flex items-center gap-1.5 text-xs">
            {check.met ? (
              <Check className="h-3 w-3 text-green-500" />
            ) : (
              <X className="h-3 w-3 text-muted-foreground" />
            )}
            <span className={check.met ? "text-foreground" : "text-muted-foreground"}>{check.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PasswordStrengthIndicator;
