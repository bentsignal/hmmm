"use client";

import {
  Loading,
  Connection,
  Field,
  Input,
  FieldError,
  Link as ClerkLink,
  Label,
} from "@clerk/elements/common";
import { Root, Step, Action, Captcha, Strategy } from "@clerk/elements/sign-up";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SimpleIcon } from "@/components/simple-icon";
import { useTheme } from "next-themes";
import { Loader } from "lucide-react";
import { Input as UIInput } from "@/components/ui/input";
// import { Label as UILabel } from "@/components/ui/label";
import DefaultLoading from "@/components/default-loading";

export default function SignUpComponent() {
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
                    <CardHeader className="flex flex-col items-center justify-center">
                      <span className="text-2xl font-bold">QBE</span>
                    </CardHeader>
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
                                Sign up with Google
                              </div>
                            )
                          }
                        </Loading>
                      </Button>
                    </Connection>
                    <p className="text-muted-foreground before:bg-border after:bg-border flex items-center gap-x-3 text-sm before:h-px before:flex-1 after:h-px after:flex-1">
                      or
                    </p>
                    <Field name="emailAddress" className="space-y-2">
                      <Input type="email" required asChild>
                        <UIInput
                          placeholder="Enter your email"
                          className="placeholder:text-sm"
                        />
                      </Input>
                      <FieldError className="text-destructive block text-sm" />
                    </Field>
                    <Captcha className="empty:hidden" />
                    <Action submit asChild>
                      <Button disabled={isGlobalLoading}>
                        <Loading>
                          {(isLoading) => {
                            return isLoading ? (
                              <Loader className="size-4 animate-spin" />
                            ) : (
                              "Sign up"
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
                        <ClerkLink navigate="sign-in">
                          Already have an account? Sign in
                        </ClerkLink>
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              </Step>

              {/* <Step name="continue">
                <Card className="w-full sm:w-96">
                  <CardHeader className="text-center">
                    <CardTitle>Create your account</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Field name="username" className="space-y-2">
                      <Label>
                        <UILabel className="mb-2">Username</UILabel>
                      </Label>
                      <Input type="text" required asChild>
                        <UIInput placeholder="Chose a username" />
                      </Input>
                      <FieldError className="text-destructive block text-sm" />
                    </Field>
                  </CardContent>
                  <CardContent className="flex flex-row gap-x-2">
                    <Field name="firstName" className="space-y-2">
                      <Label>
                        <UILabel className="mb-2">First Name</UILabel>
                      </Label>
                      <Input type="text" required asChild>
                        <UIInput placeholder="First Name" />
                      </Input>
                      <FieldError className="text-destructive block text-sm" />
                    </Field>
                    <Field name="lastName" className="space-y-2">
                      <Label>
                        <UILabel className="mb-2">Last Name</UILabel>
                      </Label>
                      <Input type="text" required asChild>
                        <UIInput placeholder="Last Name" />
                      </Input>
                      <FieldError className="text-destructive block text-sm" />
                    </Field>
                  </CardContent>
                  <CardFooter>
                    <div className="mt-2 grid w-full gap-y-4">
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
              </Step> */}

              <Step name="verifications">
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
