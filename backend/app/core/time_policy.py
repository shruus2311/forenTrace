from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import BaseModel, ConfigDict, Field, model_validator


class TimePolicy(BaseModel):
    model_config = ConfigDict(extra="forbid")
    timezone: str = "UTC"
    weekdays: set[int] = Field(default_factory=lambda: set(range(1, 8)), min_length=1)
    opens: time | None = None
    closes: time | None = None
    valid_from: datetime | None = None
    valid_until: datetime | None = None
    step_up_minutes: int | None = Field(default=None, ge=1, le=60)

    @model_validator(mode="after")
    def validate_schedule(self):
        try:
            ZoneInfo(self.timezone)
        except (ZoneInfoNotFoundError, ValueError) as error:
            raise ValueError("Supply a valid IANA time zone.") from error
        if not self.weekdays <= set(range(1, 8)):
            raise ValueError("Weekdays must be ISO numbers 1 through 7.")
        if (self.opens is None) != (self.closes is None) or (
            self.opens is not None and (self.opens == self.closes or self.opens.tzinfo or self.closes.tzinfo)
        ):
            raise ValueError("Supply two different local access times.")
        if any(value is not None and value.utcoffset() is None for value in (self.valid_from, self.valid_until)):
            raise ValueError("Access dates must include a UTC offset.")
        if self.valid_from and self.valid_until and self.valid_from >= self.valid_until:
            raise ValueError("Access must expire after it starts.")
        return self

    def restriction(self, now: datetime, step_up: datetime | None) -> str | None:
        if (self.valid_from and now < self.valid_from) or (self.valid_until and now >= self.valid_until):
            return "This case is outside its approved access period."
        local = now.astimezone(ZoneInfo(self.timezone))
        clock = local.time()
        weekday = local.isoweekday()
        if self.opens is not None:
            if self.opens < self.closes:
                inside = self.opens <= clock < self.closes
            else:
                inside = clock >= self.opens or clock < self.closes
                if clock < self.closes:
                    weekday = (local.date() - timedelta(days=1)).isoweekday()
            if not inside:
                return "This case is outside its approved access hours."
        if weekday not in self.weekdays:
            return "This case is outside its approved access days."
        if self.step_up_minutes and (step_up is None or not now - timedelta(minutes=self.step_up_minutes) < step_up <= now):
            return "Verify with a passkey in System Settings to access this case."
        return None
