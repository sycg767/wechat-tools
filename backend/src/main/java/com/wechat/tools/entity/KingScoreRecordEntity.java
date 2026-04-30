package com.wechat.tools.entity;

import io.hypersistence.utils.hibernate.type.json.JsonBinaryType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.Type;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "king_score_records")
public class KingScoreRecordEntity extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "session_id")
    private UUID sessionId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id")
    private KingScoreMemberEntity member;

    @Type(JsonBinaryType.class)
    @Column(name = "record_detail", columnDefinition = "jsonb", nullable = false)
    private Map<String, Object> recordDetail;

    @Column(name = "match_time")
    private LocalDateTime matchTime;
}