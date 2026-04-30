package com.wechat.tools.entity;

import io.hypersistence.utils.hibernate.type.array.ListArrayType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.Type;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "king_score_members")
public class KingScoreMemberEntity extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private UserEntity user;

    @Column(name = "real_name", nullable = false)
    private String realName;

    @Type(ListArrayType.class)
    @Column(name = "game_names", columnDefinition = "text ARRAY")
    private List<String> gameNames;

    @Column(name = "total_deducted")
    private Integer totalDeducted = 0;

    @Column(name = "daily_deducted")
    private Integer dailyDeducted = 0;

    @Column(name = "daily_score_date")
    private LocalDate dailyScoreDate;

    private Boolean active = true;
}