"use client";

import {
  Link as ClerkLink,
  Connection,
  Field,
  FieldError,
  Input,
  Label,
  Loading,
} from "@clerk/elements/common";
import {
  // Passkey,
  Action,
  Root,
  Step,
  Strategy,
  SupportedStrategy,
} from "@clerk/elements/sign-in";
import { Loader } from "lucide-react";
import { useTheme } from "next-themes";
import DefaultLoading from "@/components/default-loading";
import Logo from "@/components/logo";
import { SimpleIcon } from "@/components/simple-icon";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input as UIInput } from "@/components/ui/input";

export default function SignInComponent() {
  const { theme } = useTheme();
  const color = theme === "light" ? "black" : "white";
  return (
    <div className="grid w-full grow items-center px-4 sm:justify-center">
      <Root fallback={<DefaultLoading />}>
        <Loading>
          {(isGlobalLoading) => (
            <>
              <Step name="start">
                <Card className="flex w-full flex-col items-center justify-center sm:w-96">
                  <CardHeader className="flex flex-col items-center justify-center">
                    <Logo size={50} containerClass="mt-4 mb-2" />
                  </CardHeader>
                  <CardContent className="mt-2 flex w-[90%] flex-col gap-y-4 sm:w-[80%]">
                    <Connection name="google" asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        type="button"
                        disabled={isGlobalLoading}
                        className="w-full"
                      >
                        <Loading scope="provider:google">
                          {(isLoading) =>
                            isLoading ? (
                              <Loader className="size-4 animate-spin" />
                            ) : (
                              <div className="flex items-center gap-x-2">
                                <SimpleIcon
                                  icon="siGoogle"
                                  color={color}
                                  width={20}
                                  height={20}
                                />
                                Sign in with Google
                              </div>
                            )
                          }
                        </Loading>
                      </Button>
                    </Connection>
                    {/* <Passkey asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        type="button"
                        disabled={isGlobalLoading}
                        className="w-full"
                      >
                        <Loading>
                          {(isLoading) => {
                            return isLoading ? (
                              <Loader className="size-4 animate-spin" />
                            ) : (
                              <div className="flex items-center gap-x-2">
                                <KeyRound className="size-4" />
                                Use a passkey
                              </div>
                            );
                          }}
                        </Loading>
                      </Button>
                    </Passkey> */}
                    <p className="text-muted-foreground before:bg-border after:bg-border flex items-center gap-x-3 text-sm before:h-px before:flex-1 after:h-px after:flex-1">
                      or
                    </p>
                    <Field name="identifier" className="space-y-2">
                      <Input type="email" required asChild>
                        <UIInput
                          placeholder="Enter your email"
                          className="placeholder:text-sm"
                        />
                      </Input>
                      <FieldError className="text-destructive block text-sm" />
                    </Field>
                    <Action submit asChild>
                      <Button disabled={isGlobalLoading}>
                        <Loading>
                          {(isLoading) => {
                            return isLoading ? (
                              <Loader className="size-4 animate-spin" />
                            ) : (
                              "Sign in"
                            );
                          }}
                        </Loading>
                      </Button>
                    </Action>
                  </CardContent>
                  <CardFooter>
                    <div className="grid w-full">
                      <Button
                        variant="link"
                        size="sm"
                        className="font-medium"
                        asChild
                      >
                        <ClerkLink navigate="sign-up">
                          Don&apos;t have an account? Sign up
                        </ClerkLink>
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              </Step>

              <Step name="choose-strategy">
                <Card className="w-full text-center sm:w-96">
                  <CardHeader>
                    <CardTitle>Choose a verification method</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <SupportedStrategy name="email_code" asChild>
                      <Button size="sm" variant="outline" className="w-full">
                        Get a code via email
                      </Button>
                    </SupportedStrategy>
                  </CardContent>
                </Card>
              </Step>

              <Step name="verifications">
                {/* <Strategy name="passkey">
                  <Card className="w-full sm:w-96">
                    <CardHeader className="flex flex-col items-center justify-center text-center">
                      <CardTitle>Verification</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-y-2 text-center">
                      <Passkey asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          type="button"
                          disabled={isGlobalLoading}
                          className="w-full"
                        >
                          <Loading>
                            {(isLoading) => {
                              return isLoading ? (
                                <Loader className="size-4 animate-spin" />
                              ) : (
                                <div className="flex items-center gap-x-2">
                                  <KeyRound className="size-4" />
                                  Use a passkey
                                </div>
                              );
                            }}
                          </Loading>
                        </Button>
                      </Passkey>
                      <Action navigate="choose-strategy" asChild>
                        <Button
                          variant="link"
                          size="sm"
                          className="hover:cursor-pointer"
                        >
                          Use a different verification method
                        </Button>
                      </Action>
                    </CardContent>
                  </Card>
                </Strategy> */}
                <Strategy name="email_code">
                  <Card className="w-full sm:w-96">
                    <CardHeader className="flex flex-col items-center justify-center text-center">
                      <CardTitle>Check your email</CardTitle>
                      <CardDescription>
                        Enter the verification code below
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-y-4">
                      <Field name="code">
                        <Label className="sr-only">
                          Email verification code
                        </Label>
                        <div className="grid items-center justify-center gap-y-2">
                          <div className="flex justify-center text-center">
                            <Input
                              type="otp"
                              autoSubmit
                              className="flex justify-center has-[:disabled]:opacity-50"
                              render={({ value, status }) => {
                                return (
                                  <div
                                    data-status={status}
                                    className="border-input data-[status=selected]:ring-ring data-[status=cursor]:ring-ring relative flex h-9 w-9 items-center justify-center border-y border-r text-sm shadow-sm transition-all first:rounded-l-md first:border-l last:rounded-r-md data-[status=cursor]:ring-1 data-[status=selected]:ring-1"
                                  >
                                    {value}
                                  </div>
                                );
                              }}
                            />
                          </div>
                          <FieldError className="text-destructive block text-center text-sm" />
                          <Action
                            asChild
                            resend
                            className="text-muted-foreground hover:cursor-pointer"
                            fallback={({ resendableAfter }) => (
                              <Button variant="link" size="sm" disabled>
                                Didn&apos;t receive a code? Resend (
                                <span className="tabular-nums">
                                  {resendableAfter}
                                </span>
                                )
                              </Button>
                            )}
                          >
                            <Button variant="link" size="sm">
                              Didn&apos;t receive a code? Resend
                            </Button>
                          </Action>
                        </div>
                      </Field>
                    </CardContent>
                    <CardFooter>
                      <div className="grid w-full gap-y-4">
                        <Action submit asChild>
                          <Button disabled={isGlobalLoading}>
                            <Loading>
                              {(isLoading) => {
                                return isLoading ? (
                                  <Loader className="size-4 animate-spin" />
                                ) : (
                                  "Continue"
                                );
                              }}
                            </Loading>
                          </Button>
                        </Action>
                      </div>
                    </CardFooter>
                  </Card>
                </Strategy>
              </Step>
            </>
          )}
        </Loading>
      </Root>
    </div>
  );
}
