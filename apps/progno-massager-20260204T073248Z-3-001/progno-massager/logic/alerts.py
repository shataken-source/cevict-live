"""
PROGNO Alert System
====================
Real-time alerting for arbitrage opportunities and high-confidence predictions.

Features:
- Arbitrage detection across platforms
- High-confidence prediction alerts
- Custom alert rules
- Multi-channel notifications (SMS, Email, Webhook)
- Alert throttling and deduplication
"""

import os
import json
import hashlib
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Callable, Any
from dataclasses import dataclass, field
from enum import Enum
import logging
import requests

logger = logging.getLogger("PROGNO_ALERTS")


class AlertPriority(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class AlertType(Enum):
    ARBITRAGE = "arbitrage"
    HIGH_CONFIDENCE = "high_confidence"
    MARKET_MOVE = "market_move"
    DEADLINE = "deadline"
    SYSTEM = "system"
    CUSTOM = "custom"


@dataclass
class Alert:
    """Represents a single alert."""
    alert_id: str
    alert_type: AlertType
    priority: AlertPriority
    title: str
    message: str
    data: Dict = field(default_factory=dict)
    domain: str = "general"
    created_at: datetime = field(default_factory=datetime.now)
    expires_at: datetime = None
    acknowledged: bool = False
    sent_channels: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict:
        return {
            "alert_id": self.alert_id,
            "alert_type": self.alert_type.value,
            "priority": self.priority.value,
            "title": self.title,
            "message": self.message,
            "data": self.data,
            "domain": self.domain,
            "created_at": self.created_at.isoformat(),
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "acknowledged": self.acknowledged,
            "sent_channels": self.sent_channels
        }


class AlertRule:
    """Defines conditions for triggering alerts."""
    
    def __init__(self, 
                 name: str,
                 condition: Callable[[Dict], bool],
                 alert_type: AlertType,
                 priority: AlertPriority,
                 message_template: str,
                 cooldown_minutes: int = 15):
        self.name = name
        self.condition = condition
        self.alert_type = alert_type
        self.priority = priority
        self.message_template = message_template
        self.cooldown_minutes = cooldown_minutes
        self._last_triggered: Dict[str, datetime] = {}
    
    def check(self, data: Dict) -> Optional[str]:
        """
        Check if rule should trigger.
        Returns alert message if triggered, None otherwise.
        """
        # Generate unique key for this data item
        data_key = hashlib.md5(json.dumps(data, sort_keys=True, default=str).encode()).hexdigest()
        
        # Check cooldown
        if data_key in self._last_triggered:
            if datetime.now() - self._last_triggered[data_key] < timedelta(minutes=self.cooldown_minutes):
                return None
        
        # Check condition
        if self.condition(data):
            self._last_triggered[data_key] = datetime.now()
            return self.message_template.format(**data)
        
        return None


class NotificationChannel:
    """Base class for notification channels."""
    
    def __init__(self, name: str, enabled: bool = True):
        self.name = name
        self.enabled = enabled
    
    def send(self, alert: Alert) -> bool:
        """Send alert through this channel. Override in subclasses."""
        raise NotImplementedError


class WebhookChannel(NotificationChannel):
    """Send alerts via webhook (Discord, Slack, etc.)."""
    
    def __init__(self, webhook_url: str, name: str = "webhook"):
        super().__init__(name)
        self.webhook_url = webhook_url
    
    def send(self, alert: Alert) -> bool:
        if not self.enabled or not self.webhook_url:
            return False
        
        try:
            # Format for Discord/Slack-like webhooks
            payload = {
                "content": f"🚨 **{alert.title}**",
                "embeds": [{
                    "title": alert.title,
                    "description": alert.message,
                    "color": self._get_color(alert.priority),
                    "fields": [
                        {"name": "Type", "value": alert.alert_type.value, "inline": True},
                        {"name": "Priority", "value": alert.priority.value, "inline": True},
                        {"name": "Domain", "value": alert.domain, "inline": True}
                    ],
                    "timestamp": alert.created_at.isoformat()
                }]
            }
            
            response = requests.post(self.webhook_url, json=payload, timeout=10)
            return response.status_code == 204 or response.status_code == 200
            
        except Exception as e:
            logger.error(f"Webhook error: {e}")
            return False
    
    def _get_color(self, priority: AlertPriority) -> int:
        colors = {
            AlertPriority.LOW: 0x3498db,      # Blue
            AlertPriority.MEDIUM: 0xf39c12,   # Orange
            AlertPriority.HIGH: 0xe74c3c,     # Red
            AlertPriority.CRITICAL: 0x9b59b6  # Purple
        }
        return colors.get(priority, 0x95a5a6)


class SMSChannel(NotificationChannel):
    """Send alerts via SMS (Sinch)."""
    
    def __init__(self):
        super().__init__("sms")
        self.sinch_key_id = os.environ.get("SINCH_KEY_ID")
        self.sinch_key_secret = os.environ.get("SINCH_KEY_SECRET")
        self.sinch_project_id = os.environ.get("SINCH_PROJECT_ID")
        self.sinch_number = os.environ.get("SINCH_NUMBER")
        self.recipient = os.environ.get("MY_PERSONAL_NUMBER")
        
        self.enabled = all([self.sinch_key_id, self.sinch_key_secret, 
                           self.sinch_project_id, self.recipient])
    
    def send(self, alert: Alert) -> bool:
        if not self.enabled:
            return False
        
        # Only send HIGH and CRITICAL priority via SMS
        if alert.priority not in [AlertPriority.HIGH, AlertPriority.CRITICAL]:
            return False
        
        try:
            from sinch import SinchClient
            
            client = SinchClient(
                key_id=self.sinch_key_id,
                key_secret=self.sinch_key_secret,
                project_id=self.sinch_project_id
            )
            
            message = f"🚨 PROGNO ALERT\n{alert.title}\n{alert.message[:140]}"
            
            response = client.sms.batches.send(
                body=message,
                to=[self.recipient],
                from_=self.sinch_number
            )
            
            logger.info(f"SMS sent: {response.id}")
            return True
            
        except Exception as e:
            logger.error(f"SMS error: {e}")
            return False


class EmailChannel(NotificationChannel):
    """Send alerts via email."""
    
    def __init__(self, recipient: str = None):
        super().__init__("email")
        self.recipient = recipient or os.environ.get("ALERT_EMAIL")
        self.enabled = bool(self.recipient)
    
    def send(self, alert: Alert) -> bool:
        # Email implementation would go here
        # Could use SendGrid, AWS SES, etc.
        logger.info(f"Email alert (simulated): {alert.title} -> {self.recipient}")
        return True


class AlertManager:
    """
    Central alert management system.
    """
    
    def __init__(self, supabase_client=None):
        self.supabase = supabase_client
        self.rules: List[AlertRule] = []
        self.channels: List[NotificationChannel] = []
        self.alerts: List[Alert] = []
        self._alert_history: Dict[str, datetime] = {}
        self._dedup_window_minutes = 30
        
        # Initialize default rules
        self._setup_default_rules()
        
        # Initialize channels
        self._setup_channels()
    
    def _setup_default_rules(self):
        """Setup default alert rules."""
        
        # Arbitrage detection rule
        self.add_rule(AlertRule(
            name="arbitrage_opportunity",
            condition=lambda d: d.get('is_arb', False) and d.get('profit_pct', 0) > 0.5,
            alert_type=AlertType.ARBITRAGE,
            priority=AlertPriority.HIGH,
            message_template="💰 Arbitrage found: {event_name}\nProfit: {profit_pct:.2f}%\nStakes: ${stakes}",
            cooldown_minutes=30
        ))
        
        # High confidence prediction rule
        self.add_rule(AlertRule(
            name="high_confidence",
            condition=lambda d: d.get('progno_score', 0) >= 0.80,
            alert_type=AlertType.HIGH_CONFIDENCE,
            priority=AlertPriority.MEDIUM,
            message_template="🎯 High confidence: {event_name}\nScore: {progno_score:.1%}\nDomain: {domain}",
            cooldown_minutes=60
        ))
        
        # Very high confidence rule (>90%)
        self.add_rule(AlertRule(
            name="very_high_confidence",
            condition=lambda d: d.get('progno_score', 0) >= 0.90,
            alert_type=AlertType.HIGH_CONFIDENCE,
            priority=AlertPriority.HIGH,
            message_template="🔥 VERY HIGH confidence: {event_name}\nScore: {progno_score:.1%}\nDomain: {domain}",
            cooldown_minutes=30
        ))
        
        # Deadline approaching rule
        self.add_rule(AlertRule(
            name="deadline_approaching",
            condition=lambda d: d.get('hours_until_resolution', 999) <= 24 and d.get('progno_score', 0.5) >= 0.70,
            alert_type=AlertType.DEADLINE,
            priority=AlertPriority.MEDIUM,
            message_template="⏰ Deadline soon: {event_name}\n{hours_until_resolution:.0f} hours remaining\nScore: {progno_score:.1%}",
            cooldown_minutes=120
        ))
        
        # Major market move rule (for crypto/stocks)
        self.add_rule(AlertRule(
            name="market_move",
            condition=lambda d: abs(d.get('price_change_24h', 0)) >= 10,
            alert_type=AlertType.MARKET_MOVE,
            priority=AlertPriority.MEDIUM,
            message_template="📈 Big move: {event_name}\n24h change: {price_change_24h:+.1f}%\nCurrent: ${current_price:,.2f}",
            cooldown_minutes=60
        ))
    
    def _setup_channels(self):
        """Setup notification channels."""
        
        # Discord/Slack webhook
        discord_url = os.environ.get("DISCORD_WEBHOOK_URL")
        if discord_url:
            self.add_channel(WebhookChannel(discord_url, "discord"))
        
        slack_url = os.environ.get("SLACK_WEBHOOK_URL")
        if slack_url:
            self.add_channel(WebhookChannel(slack_url, "slack"))
        
        # SMS for high priority
        self.add_channel(SMSChannel())
        
        # Email
        self.add_channel(EmailChannel())
    
    def add_rule(self, rule: AlertRule):
        """Add a new alert rule."""
        self.rules.append(rule)
    
    def add_channel(self, channel: NotificationChannel):
        """Add a notification channel."""
        self.channels.append(channel)
    
    def check_data(self, data: Dict) -> List[Alert]:
        """
        Check data against all rules and generate alerts.
        """
        triggered_alerts = []
        
        for rule in self.rules:
            message = rule.check(data)
            if message:
                alert = self._create_alert(rule, data, message)
                
                # Check for duplicates
                if not self._is_duplicate(alert):
                    triggered_alerts.append(alert)
                    self.alerts.append(alert)
                    
                    # Send through channels
                    self._send_alert(alert)
        
        return triggered_alerts
    
    def check_dataframe(self, df) -> List[Alert]:
        """
        Check all rows in a DataFrame against rules.
        """
        all_alerts = []
        
        for _, row in df.iterrows():
            alerts = self.check_data(row.to_dict())
            all_alerts.extend(alerts)
        
        return all_alerts
    
    def _create_alert(self, rule: AlertRule, data: Dict, message: str) -> Alert:
        """Create an alert from a triggered rule."""
        alert_id = hashlib.md5(
            f"{rule.name}_{data.get('event_id', '')}_{datetime.now().isoformat()}".encode()
        ).hexdigest()[:12]
        
        return Alert(
            alert_id=alert_id,
            alert_type=rule.alert_type,
            priority=rule.priority,
            title=f"{rule.alert_type.value.replace('_', ' ').title()}: {data.get('event_name', 'Unknown')}",
            message=message,
            data=data,
            domain=data.get('domain', 'general'),
            expires_at=datetime.now() + timedelta(hours=24)
        )
    
    def _is_duplicate(self, alert: Alert) -> bool:
        """Check if this is a duplicate alert."""
        # Create fingerprint
        fingerprint = f"{alert.alert_type.value}_{alert.data.get('event_id', '')}"
        
        if fingerprint in self._alert_history:
            if datetime.now() - self._alert_history[fingerprint] < timedelta(minutes=self._dedup_window_minutes):
                return True
        
        self._alert_history[fingerprint] = datetime.now()
        return False
    
    def _send_alert(self, alert: Alert):
        """Send alert through all enabled channels."""
        for channel in self.channels:
            try:
                if channel.send(alert):
                    alert.sent_channels.append(channel.name)
                    logger.info(f"Alert sent via {channel.name}: {alert.alert_id}")
            except Exception as e:
                logger.error(f"Failed to send via {channel.name}: {e}")
        
        # Store in Supabase
        if self.supabase:
            try:
                self.supabase.table("progno_alerts").insert(alert.to_dict()).execute()
            except Exception as e:
                logger.error(f"Failed to store alert: {e}")
    
    def get_active_alerts(self, domain: str = None) -> List[Alert]:
        """Get all active (non-expired, non-acknowledged) alerts."""
        now = datetime.now()
        
        active = [
            a for a in self.alerts
            if not a.acknowledged and (a.expires_at is None or a.expires_at > now)
        ]
        
        if domain:
            active = [a for a in active if a.domain == domain]
        
        return sorted(active, key=lambda a: a.created_at, reverse=True)
    
    def acknowledge_alert(self, alert_id: str) -> bool:
        """Mark an alert as acknowledged."""
        for alert in self.alerts:
            if alert.alert_id == alert_id:
                alert.acknowledged = True
                
                if self.supabase:
                    try:
                        self.supabase.table("progno_alerts").update(
                            {"acknowledged": True}
                        ).eq("alert_id", alert_id).execute()
                    except:
                        pass
                
                return True
        return False
    
    def get_alert_summary(self) -> Dict:
        """Get summary of alert activity."""
        now = datetime.now()
        last_24h = now - timedelta(hours=24)
        
        recent = [a for a in self.alerts if a.created_at > last_24h]
        
        return {
            "total_24h": len(recent),
            "by_type": {
                t.value: len([a for a in recent if a.alert_type == t])
                for t in AlertType
            },
            "by_priority": {
                p.value: len([a for a in recent if a.priority == p])
                for p in AlertPriority
            },
            "active_count": len(self.get_active_alerts()),
            "channels_configured": [c.name for c in self.channels if c.enabled]
        }


class ArbitrageScanner:
    """
    Dedicated arbitrage scanning with cross-platform detection.
    """
    
    def __init__(self, alert_manager: AlertManager):
        self.alert_manager = alert_manager
        self.min_profit_pct = 0.5  # Minimum 0.5% profit
    
    def scan_prediction_markets(self, kalshi_df, polymarket_df=None) -> List[Dict]:
        """
        Scan for arbitrage across prediction market platforms.
        """
        opportunities = []
        
        if polymarket_df is None:
            # Single platform - check for yes/no arb
            for _, row in kalshi_df.iterrows():
                yes_price = row.get('yes_price', 0)
                no_price = row.get('no_price', 0)
                
                if yes_price > 0 and no_price > 0:
                    total = yes_price + no_price
                    
                    if total < 1.0:  # Arbitrage exists
                        profit_pct = (1 - total) * 100
                        
                        if profit_pct >= self.min_profit_pct:
                            opp = {
                                'event_id': row.get('event_id'),
                                'event_name': row.get('event_name'),
                                'is_arb': True,
                                'profit_pct': profit_pct,
                                'yes_price': yes_price,
                                'no_price': no_price,
                                'total_cost': total,
                                'stakes': [yes_price * 100, no_price * 100],  # For $100 bankroll
                                'domain': 'prediction_markets'
                            }
                            opportunities.append(opp)
                            
                            # Trigger alert
                            self.alert_manager.check_data(opp)
        else:
            # Cross-platform arbitrage
            for _, kalshi_row in kalshi_df.iterrows():
                event_id = kalshi_row.get('event_id')
                
                # Find matching event on Polymarket
                poly_match = polymarket_df[polymarket_df['event_id'] == event_id]
                
                if not poly_match.empty:
                    poly_row = poly_match.iloc[0]
                    
                    # Check Kalshi YES + Polymarket NO
                    k_yes = kalshi_row.get('yes_price', 1)
                    p_no = poly_row.get('no_price', 1)
                    
                    total1 = k_yes + p_no
                    if total1 < 1.0:
                        profit_pct = (1 - total1) * 100
                        if profit_pct >= self.min_profit_pct:
                            opportunities.append({
                                'event_id': event_id,
                                'event_name': kalshi_row.get('event_name'),
                                'is_arb': True,
                                'profit_pct': profit_pct,
                                'strategy': 'Kalshi YES + Polymarket NO',
                                'domain': 'prediction_markets'
                            })
                    
                    # Check Polymarket YES + Kalshi NO
                    p_yes = poly_row.get('yes_price', 1)
                    k_no = kalshi_row.get('no_price', 1)
                    
                    total2 = p_yes + k_no
                    if total2 < 1.0:
                        profit_pct = (1 - total2) * 100
                        if profit_pct >= self.min_profit_pct:
                            opportunities.append({
                                'event_id': event_id,
                                'event_name': kalshi_row.get('event_name'),
                                'is_arb': True,
                                'profit_pct': profit_pct,
                                'strategy': 'Polymarket YES + Kalshi NO',
                                'domain': 'prediction_markets'
                            })
        
        return opportunities
    
    def scan_crypto_defi(self, df) -> List[Dict]:
        """
        Scan for DeFi/DEX arbitrage opportunities.
        """
        # Would compare prices across DEXes
        # Placeholder for actual DEX integration
        return []


# Factory functions
def get_alert_manager(supabase_client=None) -> AlertManager:
    """Get singleton alert manager."""
    return AlertManager(supabase_client)

def get_arbitrage_scanner(alert_manager: AlertManager) -> ArbitrageScanner:
    """Get arbitrage scanner."""
    return ArbitrageScanner(alert_manager)

