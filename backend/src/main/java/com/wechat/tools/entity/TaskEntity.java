package com.wechat.tools.entity;

import io.hypersistence.utils.hibernate.type.json.JsonBinaryType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.Type;

import java.util.Map;

@Getter
@Setter
@Entity
@Table(name = "tasks")
public class TaskEntity extends BaseEntity {

    @Id
    private String id;

    @Column(name = "tool_type", nullable = false)
    private String toolType;

    @Column(name = "source_file_name")
    private String sourceFileName;

    @Column(nullable = false)
    private String status;

    private Integer progress;

    private String message;

    @Type(JsonBinaryType.class)
    @Column(name = "result_data", columnDefinition = "jsonb")
    private Map<String, Object> resultData;
}