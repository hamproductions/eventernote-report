import { HStack, styled } from "styled-system/jsx";

export function PillGroup<T extends string>({ label, value, options, onChange }: {
  label: string;
  value: T | null;
  options: readonly (readonly [T, string])[];
  onChange: (value: T) => void;
}) {
  return (
    <HStack role="group" aria-label={label} gap="0.5" p="0.5" bg="bg.subtle" borderWidth="1px" borderColor="border.subtle" borderRadius="lg" w="max-content">
      {options.map(([key, text]) => (
        <styled.button
          key={key}
          type="button"
          aria-pressed={value === key}
          onClick={() => onChange(key)}
          px="3"
          h={{ base: "11", md: "7" }}
          fontSize="sm"
          fontWeight="medium"
          whiteSpace="nowrap"
          borderRadius="md"
          cursor="pointer"
          color={value === key ? "fg.default" : "fg.muted"}
          bg={value === key ? "bg.default" : "transparent"}
          boxShadow={value === key ? "xs" : "none"}
          _hover={{ color: "fg.default" }}
        >
          {text}
        </styled.button>
      ))}
    </HStack>
  );
}
