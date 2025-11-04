import { useState } from "react";
import { Box, VStack } from "styled-system/jsx";
import { css } from "styled-system/css";
import { Button } from "~/components/ui/button";
import * as Card from "~/components/ui/styled/card";
import { Heading } from "~/components/ui/heading";
import { Text } from "~/components/ui/text";

interface UserInputFormProps {
  onSubmit: (userId: string) => void;
}

export function UserInputForm({ onSubmit }: UserInputFormProps) {
  const [inputValue, setInputValue] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(inputValue);
  };

  return (
    <Box
      bg="bg.default"
      colorPalette="blue"
      minH="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      p={{ base: "6", md: "8" }}
    >
      <VStack gap="8" alignItems="stretch" maxW="550px" w="full">
        <VStack gap="3" alignItems="center" textAlign="center">
          <Heading size="4xl" color="fg.default">
            Eventernote Reports
          </Heading>
          <Text size="md" color="fg.muted" maxW="400px">
            Analyze your concert history, discover patterns, and visualize your
            live music journey
          </Text>
        </VStack>

        <Card.Root>
          <Card.Header>
            <Card.Title>Get Started</Card.Title>
            <Card.Description>
              Enter your Eventernote User ID to generate your personalized
              report
            </Card.Description>
          </Card.Header>
          <Card.Body>
            <form onSubmit={handleSubmit} style={{ width: "100%" }}>
              <VStack gap="6" alignItems="stretch">
                <VStack gap="3" alignItems="stretch">
                  <Text size="sm" fontWeight="medium" color="fg.default">
                    Eventernote User ID
                  </Text>
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="e.g., HamP_punipuni"
                    className={css({
                      w: "full",
                      p: "3.5",
                      borderRadius: "md",
                      borderWidth: "1px",
                      borderColor: "border.default",
                      bg: "bg.default",
                      color: "fg.default",
                      fontSize: "md",
                      transition: "all 0.2s",
                      _hover: {
                        borderColor: "border.emphasized"
                      },
                      _focus: {
                        outline: "none",
                        borderColor: "colorPalette.default",
                        ring: "2px",
                        ringColor: "colorPalette.default",
                        ringOffset: "2px"
                      },
                      _placeholder: {
                        color: "fg.subtle"
                      }
                    })}
                  />
                  <Text size="xs" color="fg.muted">
                    Find your User ID in your Eventernote profile URL
                  </Text>
                </VStack>

                <Button
                  type="submit"
                  w="full"
                  size="lg"
                  colorPalette="blue"
                  disabled={!inputValue.trim()}
                >
                  Generate Report
                </Button>
              </VStack>
            </form>
          </Card.Body>
        </Card.Root>

        <Text size="xs" color="fg.subtle" textAlign="center">
          Your data is fetched in real-time from Eventernote and cached for 5
          minutes
        </Text>
      </VStack>
    </Box>
  );
}
