/**
 * src/components/LinkifiedText.js
 *
 * React Native equivalent of the web LinkifiedText component.
 * Detects URLs in plain text and renders them as tappable Text spans
 * that open in the device browser via Linking.openURL.
 *
 * Usage:
 *   <LinkifiedText
 *     text="Check the form at https://forms.gle/abc123 for details."
 *     style={s.cardBody}
 *     numberOfLines={3}
 *     linkStyle={{ color: '#1a3a5c', textDecorationLine: 'underline' }}
 *   />
 */

import React from 'react';
import { Text, Linking, Alert } from 'react-native';

const URL_REGEX = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)/g;

function shortenUrl(url, maxLen = 45) {
  try {
    const { hostname, pathname } = new URL(url);
    const short = hostname + (pathname === '/' ? '' : pathname);
    return short.length > maxLen ? short.slice(0, maxLen) + '…' : short;
  } catch {
    return url.length > maxLen ? url.slice(0, maxLen) + '…' : url;
  }
}

async function openUrl(url) {
  try {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Cannot open link', url);
    }
  } catch {
    Alert.alert('Cannot open link', url);
  }
}

export function LinkifiedText({ text, style, linkStyle, numberOfLines, shorten = true }) {
  if (!text) return null;

  const parts   = [];
  let lastIndex = 0;
  let match;

  URL_REGEX.lastIndex = 0;

  while ((match = URL_REGEX.exec(text)) !== null) {
    const [url] = match;
    const { index } = match;

    // Plain text before this URL
    if (index > lastIndex) {
      parts.push(
        <Text key={`t-${index}`}>{text.slice(lastIndex, index)}</Text>
      );
    }

    // Tappable URL span
    const display = shorten ? shortenUrl(url) : url;
    parts.push(
      <Text
        key={`u-${index}`}
        style={[{ color: '#1a3a5c', textDecorationLine: 'underline' }, linkStyle]}
        onPress={() => openUrl(url)}
        accessibilityRole="link"
        accessibilityLabel={`Open link: ${url}`}
      >
        {display}
      </Text>
    );

    lastIndex = index + url.length;
  }

  // Remaining plain text after last URL
  if (lastIndex < text.length) {
    parts.push(
      <Text key={`t-end`}>{text.slice(lastIndex)}</Text>
    );
  }

  // If no URLs found at all, render as plain Text (fast path)
  if (parts.length === 0) {
    return <Text style={style} numberOfLines={numberOfLines}>{text}</Text>;
  }

  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {parts}
    </Text>
  );
}