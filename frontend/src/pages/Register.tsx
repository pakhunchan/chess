import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { registerUser } from "@/lib/api";

interface RegisterFormData {
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function Register() {
    const navigate = useNavigate();
    const { registerWithEmail, sendVerificationEmail } = useAuth();
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors },
    } = useForm<RegisterFormData>();

    // Check backend for username availability
    const checkUsernameAvailability = async (username: string) => {
        try {
            const res = await fetch(`${API_URL}/auth/check-username?username=${username}`);
            if (res.status === 409) return "Username is already taken";
            if (!res.ok) return "Error checking username";
            return true;
        } catch (e) {
            console.error(e)
            return "Error checking username";
        }
    };

    const onSubmit = async (data: RegisterFormData) => {
        if (data.password !== data.confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // 1. Verify username availability again (race condition check)
            const usernameAvailable = await checkUsernameAvailability(data.username);
            if (usernameAvailable !== true) {
                setError(typeof usernameAvailable === 'string' ? usernameAvailable : "Username unavailable");
                setLoading(false);
                return;
            }

            import { registerUser } from "@/lib/api";

            // ... existing code ...

            // 2. Create Firebase Auth User
            const user = await registerWithEmail(data.email, data.password);

            // 3. Sync Username with Backend (Crucial Step)
            await registerUser(data.username);

            // 4. Send Verification Email
            await sendVerificationEmail();

            navigate("/");
        } catch (err: any) {
            if (err.code === "auth/email-already-in-use") {
                setError("Email already in use. Try logging in.");
            } else {
                setError(err.message || "Failed to create account");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-md space-y-6 border p-8 rounded-lg shadow-sm bg-card">
                <div className="space-y-2 text-center">
                    <h1 className="text-3xl font-bold">Create Account</h1>
                    <p className="text-muted-foreground">Enter your information to get started</p>
                </div>

                {error && (
                    <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="username">Username</Label>
                        <Input
                            id="username"
                            placeholder="CoolChessPlayer"
                            {...register("username", {
                                required: "Username is required",
                                minLength: { value: 3, message: "Min 3 characters" },
                                pattern: { value: /^[a-zA-Z0-9_-]+$/, message: "Letters, numbers, _ and - only" }
                            })}
                        />
                        {errors.username && <span className="text-sm text-red-500">{errors.username.message}</span>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="m@example.com"
                            {...register("email", { required: "Email is required" })}
                        />
                        {errors.email && <span className="text-sm text-red-500">{errors.email.message}</span>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                            id="password"
                            type="password"
                            {...register("password", { required: "Password is required", minLength: { value: 6, message: "Min 6 characters" } })}
                        />
                        {errors.password && <span className="text-sm text-red-500">{errors.password.message}</span>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm Password</Label>
                        <Input
                            id="confirmPassword"
                            type="password"
                            {...register("confirmPassword", {
                                required: "Confirm Password is required",
                                validate: (val) => {
                                    if (watch("password") != val) {
                                        return "Your passwords do NOT match";
                                    }
                                }
                            })}
                        />
                        {errors.confirmPassword && <span className="text-sm text-red-500">{errors.confirmPassword.message}</span>}
                    </div>

                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? "Creating..." : "Create Account"}
                    </Button>
                </form>

                <div className="text-center text-sm">
                    Already have an account?{" "}
                    <Link to="/login" className="underline underline-offset-4 hover:text-primary">
                        Sign in
                    </Link>
                </div>
            </div>
        </div>
    );
}
