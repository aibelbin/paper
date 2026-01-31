import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Heading,
  Hr,
  Row,
  Column,
  Button,
  Link,
  Img,
} from "@react-email/components";

interface AnomalyAlertEmailProps {
  name: string;
  activityType: string;
  timestamp: string;
  location?: string;
  deviceInfo?: string;
  severity?: "low" | "medium" | "high";
  actionUrl?: string;
  description?: string;
}

const severityColors: Record<string, string> = {
  low: "#84cc16",
  medium: "#eab308",
  high: "#ef4444",
};

export default function AnomalyAlertEmail({
  name,
  activityType,
  timestamp,
  description = "We detected unusual activity on your account that deviates from your typical usage patterns. Please review the details below and take appropriate action if necessary.",
  location = "Unknown Location",
  deviceInfo = "Unknown Device",
  severity = "medium",
}: AnomalyAlertEmailProps) {
  const severityColor = severityColors[severity] || severityColors.medium;
  const severityLabel = severity.charAt(0).toUpperCase() + severity.slice(1);

  return (
    <Html>
      <Head>
        <title>Security Alert - Unusual Activity Detected</title>
      </Head>
      <Body
        style={{
          backgroundColor: "#0a0a0a",
          color: "#f5f5f5",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          margin: 0,
          padding: "20px",
        }}
      >
        <Container
          style={{
            maxWidth: "580px",
            margin: "0 auto",
            backgroundColor: "#1a1a1a",
            borderRadius: "12px",
            overflow: "hidden",
            border: "1px solid #22c55e33",
          }}
        >
          <Section
            style={{
              backgroundColor: "#0f172a",
              padding: "24px",
              borderBottom: "1px solid #22c55e33",
            }}
          >
        
            <Heading
              style={{
                color: "#22c55e",
                fontSize: "28px",
                fontWeight: "700",
                margin: "0 0 8px 0",
                textAlign: "center",
              }}
            >
              Security Alert
            </Heading>
            <Text
              style={{
                color: "#9ca3af",
                fontSize: "14px",
                textAlign: "center",
                margin: "0",
              }}
            >
              Unusual activity detected on your account
            </Text>
          </Section>

          <Section style={{ padding: "32px 24px" }}>

            <Text
              style={{
                color: "#e5e7eb",
                fontSize: "16px",
                margin: "0 0 24px 0",
                fontWeight: "500",
              }}
            >
              Hi {name},
            </Text>

            <div
              style={{
                backgroundColor: "#0f172a",
                border: `1px solid ${severityColor}33`,
                borderRadius: "8px",
                padding: "16px",
                marginBottom: "24px",
              }}
            >
              <Text
                style={{
                  color: severityColor,
                  fontSize: "14px",
                  fontWeight: "600",
                  margin: "0 0 8px 0",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                {severityLabel} Severity • Real-time Detection
              </Text>
              <Text
                style={{
                  color: "#e5e7eb",
                  fontSize: "15px",
                  margin: "0",
                  lineHeight: "1.6",
                }}
              >
                Our AI-powered security system detected{" "}
                <strong style={{ color: "#22c55e" }}>{activityType}</strong> on
                your system. This activity appears unusual based on your normal
                usage patterns.
              </Text>
            </div>

            <div
              style={{
                backgroundColor: "#111827",
                borderRadius: "8px",
                padding: "16px",
                marginBottom: "24px",
              }}
            >
              <Text
                style={{
                  color: "#22c55e",
                  fontSize: "13px",
                  fontWeight: "600",
                  margin: "0 0 12px 0",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Activity Details
              </Text>

              <Row style={{ marginBottom: "10px" }}>
                <Column style={{ width: "40%" }}>
                  <Text
                    style={{
                      color: "#9ca3af",
                      fontSize: "13px",
                      margin: "0",
                      fontWeight: "500",
                    }}
                  >
                    Timestamp:
                  </Text>
                </Column>
                <Column style={{ width: "60%", textAlign: "right" }}>
                  <Text
                    style={{
                      color: "#e5e7eb",
                      fontSize: "13px",
                      margin: "0",
                      fontWeight: "500",
                    }}
                  >
                    {timestamp}
                  </Text>
                </Column>
              </Row>

              <Row style={{ marginBottom: "10px" }}>
                <Column style={{ width: "40%" }}>
                  <Text
                    style={{
                      color: "#9ca3af",
                      fontSize: "13px",
                      margin: "0",
                      fontWeight: "500",
                    }}
                  >
                    Location:
                  </Text>
                </Column>
                <Column style={{ width: "60%", textAlign: "right" }}>
                  <Text
                    style={{
                      color: "#e5e7eb",
                      fontSize: "13px",
                      margin: "0",
                      fontWeight: "500",
                    }}
                  >
                    📍 {location}
                  </Text>
                </Column>
              </Row>

              <Row style={{ marginBottom: "0" }}>
                <Column style={{ width: "40%" }}>
                  <Text
                    style={{
                      color: "#9ca3af",
                      fontSize: "13px",
                      margin: "0",
                      fontWeight: "500",
                    }}
                  >
                    Device:
                  </Text>
                </Column>
                <Column style={{ width: "60%", textAlign: "right" }}>
                  <Text
                    style={{
                      color: "#e5e7eb",
                      fontSize: "13px",
                      margin: "0",
                      fontWeight: "500",
                    }}
                  >
                    💻 {deviceInfo}
                  </Text>
                </Column>
              </Row>
            </div>

            <div
              style={{
                backgroundColor: "#0f172a",
                borderRadius: "8px",
                padding: "16px",
                marginBottom: "24px",
                borderLeft: `4px solid #22c55e`,
              }}
            >
                <Text  
                 style={{
                  color: severityColor,
                  fontSize: "14px",
                  fontWeight: "600",
                  margin: "0 0 8px 0",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
                >
                    {description}
                </Text>
              
            </div>

          

            <div
              style={{
                backgroundColor: "#111827",
                borderRadius: "6px",
                padding: "12px",
                marginBottom: "0",
              }}
            >
              <Text
                style={{
                  color: "#9ca3af",
                  fontSize: "12px",
                  margin: "0",
                  lineHeight: "1.6",
                }}
              >
                💡 <strong>Tip:</strong> If you recognize this activity and
                everything looks fine, you can safely dismiss this alert. Our
                system learns from your patterns and will improve over time.
              </Text>
            </div>
          </Section>

          <Hr style={{ borderColor: "#22c55e33", margin: "24px 0" }} />

          <Section style={{ padding: "24px", textAlign: "center" }}>
            <Text
              style={{
                color: "#9ca3af",
                fontSize: "12px",
                margin: "0 0 8px 0",
                fontWeight: "500",
              }}
            >
              This is an automated security alert from Paper AI
            </Text>
            <Text
              style={{
                color: "#6b7280",
                fontSize: "11px",
                margin: "0 0 12px 0",
                lineHeight: "1.6",
              }}
            >
              We take your security seriously. If you believe this is an error or
              need assistance, please contact our support team.
            </Text>
            <Text
              style={{
                color: "#4b5563",
                fontSize: "10px",
                margin: "0",
              }}
            >
              Paper AI || Ai Powered Security Solutions
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
