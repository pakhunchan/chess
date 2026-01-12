import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface LoginFormData {
    identifier: string; // Email or Username
    password: string;
}

export default function Login() {
    const navigate = useNavigate();
    const { loginWithEmail, loginWithUsername, signInWithGoogle } = useAuth();
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>();

    const onSubmit = async (data: LoginFormData) => {
        setLoading(true);
        setError(null);

        try {
            const isEmail = data.identifier.includes("@");

            if (isEmail) {
                await loginWithEmail(data.identifier, data.password);
            } else {
                await loginWithUsername(data.identifier, data.password); // Resolves email from backend first
            }

            navigate("/");
        } catch (err: any) {
            console.error(err);
            if (err.code === "auth/invalid-credential" || err.message === "Username not found") {
                setError("Invalid email/username or password.");
            } else {
                setError("Failed to sign in. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        try {
            await signInWithGoogle();
            navigate("/");
        } catch (err) {
            setError("Failed to sign in with Google");
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-md space-y-6 border p-8 rounded-lg shadow-sm bg-card">
                <div className="space-y-2 text-center">
                    <h1 className="text-3xl font-bold">Welcome Back</h1>
                    <p className="text-muted-foreground">Sign in to your account</p>
                </div>

                {error && (
                    <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                <div className="space-y-4">
                    <Button variant="outline" className="w-full" onClick={handleGoogleSignIn}>
                        <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                            <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
                        </svg>
                        Sign in with Google
                    </Button>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">
                                Or continue with
                            </span>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="identifier">Email or Username</Label>
                            <Input
                                id="identifier"
                                placeholder="m@example.com or CoolPlayer"
                                {...register("identifier", { required: "Email or Username is required" })}
                            />
                            {errors.identifier && <span className="text-sm text-red-500">{errors.identifier.message}</span>}
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password">Password</Label>
                                <a href="#" className="text-sm font-medium text-primary hover:underline">
                                    Forgot password?
                                </a>
                            </div>
                            <Input
                                id="password"
                                type="password"
                                {...register("password", { required: "Password is required" })}
                            />
                            {errors.password && <span className="text-sm text-red-500">{errors.password.message}</span>}
                        </div>

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? "Signing in..." : "Sign In"}
                        </Button>
                    </form>
                </div>

                <div className="text-center text-sm">
                    Don&apos;t have an account?{" "}
                    <Link to="/register" className="underline underline-offset-4 hover:text-primary">
                        Create Account
                    </Link>
                </div>
            </div>
        </div>
    );
}
